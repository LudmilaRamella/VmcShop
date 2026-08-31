import { Promocion, TipoDescuento } from '../promociones/entities/promocion.entity';

// Este archivo concentra TODO el calculo de totales del sistema (alcances 6
// y 7 del enunciado: subtotales, descuentos, impuestos y total final). Tanto
// el carrito como la confirmacion de la compra llaman a la misma funcion
// calcularTotales(), asi el importe que el cliente ve en el carrito es
// siempre el mismo que se le termina cobrando.
//
// Orden en el que se calculan las cosas:
//   1) por cada linea: bruto = precio * cantidad
//   2) por cada linea: se descuenta la MEJOR promocion de producto vigente
//   3) se suman los subtotales de las lineas -> subtotal del pedido
//   4) sobre ese subtotal se aplica la MEJOR promocion global (si cumple
//      sus condiciones de monto minimo / cantidad minima de items)
//   5) total = subtotal - descuento global
//   6) como los precios ya incluyen IVA, se lo discrimina hacia atras
//      (no se suma, solo se muestra por separado en el comprobante)

export interface ItemParaCalculo {
  productoId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  promociones: Promocion[]; // promociones de tipo 'producto' que aplican a este producto
}

export interface LineaCalculada {
  productoId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  bruto: number;
  descuento: number;
  subtotal: number;
}

export interface ResultadoCalculo {
  lineas: LineaCalculada[];
  cantidadItems: number;
  subtotal: number;
  descuentoGlobal: number;
  descuentoTotal: number;
  total: number;
  neto: number;
  impuestos: number;
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function estaVigente(promocion: Promocion, fecha: Date): boolean {
  if (!promocion.activa) return false;
  if (promocion.fechaInicio && fecha < new Date(promocion.fechaInicio)) return false;
  if (promocion.fechaFin && fecha > new Date(`${promocion.fechaFin}T23:59:59`)) return false;
  return true;
}

// Calcula cuanto descuenta una promocion sobre un importe base, sin dejarlo
// nunca en negativo (si el descuento fijo es mayor que la base, se limita a
// la base).
function calcularDescuento(promocion: Promocion, base: number): number {
  if (promocion.tipo === TipoDescuento.PORCENTAJE) {
    return redondear((base * Number(promocion.valor)) / 100);
  }
  return Math.min(redondear(Number(promocion.valor)), base);
}

// De una lista de promociones vigentes, devuelve el descuento mas alto que
// se le puede aplicar a un importe. No se acumulan varias promociones sobre
// el mismo importe: siempre se elige una sola, la mas conveniente.
function mejorDescuento(promociones: Promocion[], base: number, fecha: Date): number {
  let mejor = 0;
  for (const promocion of promociones) {
    if (!estaVigente(promocion, fecha)) continue;
    const descuento = calcularDescuento(promocion, base);
    if (descuento > mejor) mejor = descuento;
  }
  return mejor;
}

/**
 * Calcula el precio de un producto con su mejor promocion de producto
 * vigente aplicada (si tiene alguna). La usa el catalogo para mostrar el
 * precio tachado + el precio final antes de que el producto siquiera
 * entre a un carrito.
 */
export function calcularPrecioConDescuento(
  precioBase: number,
  promociones: Promocion[],
  fecha: Date = new Date(),
): { precioFinal: number; descuento: number; promocion: Promocion | null } {
  let mejor: { promocion: Promocion; descuento: number } | null = null;

  for (const promocion of promociones) {
    if (!estaVigente(promocion, fecha)) continue;
    const descuento = calcularDescuento(promocion, precioBase);
    if (descuento > 0 && (!mejor || descuento > mejor.descuento)) {
      mejor = { promocion, descuento };
    }
  }

  return {
    precioFinal: redondear(precioBase - (mejor?.descuento ?? 0)),
    descuento: mejor?.descuento ?? 0,
    promocion: mejor?.promocion ?? null,
  };
}

export function calcularTotales(
  items: ItemParaCalculo[],
  promocionesGlobales: Promocion[],
  ivaRate: number,
  fecha: Date = new Date(),
): ResultadoCalculo {
  const lineas: LineaCalculada[] = items.map((item) => {
    const bruto = redondear(item.precioUnitario * item.cantidad);
    const descuento = mejorDescuento(item.promociones, bruto, fecha);

    return {
      productoId: item.productoId,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      bruto,
      descuento,
      subtotal: redondear(bruto - descuento),
    };
  });

  const subtotal = redondear(lineas.reduce((acumulado, l) => acumulado + l.subtotal, 0));
  const cantidadItems = lineas.reduce((acumulado, l) => acumulado + l.cantidad, 0);

  // La promocion global solo se considera si cumple sus condiciones
  // (monto minimo del pedido y/o cantidad minima de items).
  const globalesQueAplican = promocionesGlobales.filter((promocion) => {
    if (promocion.montoMinimo && subtotal < Number(promocion.montoMinimo)) return false;
    if (promocion.cantidadMinima && cantidadItems < promocion.cantidadMinima) return false;
    return true;
  });
  const descuentoGlobal = mejorDescuento(globalesQueAplican, subtotal, fecha);

  const total = redondear(subtotal - descuentoGlobal);

  // Los precios ya incluyen IVA: se calcula el neto (base imponible) hacia
  // atras y el impuesto sale de la diferencia con el total.
  const neto = redondear(total / (1 + ivaRate));
  const impuestos = redondear(total - neto);

  const descuentoItems = lineas.reduce((acumulado, l) => acumulado + l.descuento, 0);

  return {
    lineas,
    cantidadItems,
    subtotal,
    descuentoGlobal,
    descuentoTotal: redondear(descuentoItems + descuentoGlobal),
    total,
    neto,
    impuestos,
  };
}
