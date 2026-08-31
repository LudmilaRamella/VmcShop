import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Banner } from './entities/banner.entity';
import { CrearBannerDto } from './dto/crear-banner.dto';
import { ActualizarBannerDto } from './dto/actualizar-banner.dto';

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannersRepo: Repository<Banner>,
  ) {}

  // soloActivos=true es lo que consume el home; el panel de admin pide
  // todos para poder reactivar los que estan de baja.
  async listar(soloActivos = false): Promise<Banner[]> {
    return this.bannersRepo.find({
      where: soloActivos ? { activo: true } : {},
      order: { orden: 'ASC', id: 'ASC' },
    });
  }

  async obtener(id: number): Promise<Banner> {
    const banner = await this.bannersRepo.findOne({ where: { id } });
    if (!banner) throw new NotFoundException('El banner no existe');
    return banner;
  }

  async crear(datos: CrearBannerDto, nombreImagen?: string): Promise<Banner> {
    if (!nombreImagen) {
      throw new BadRequestException('El banner necesita una imagen');
    }
    const banner = this.bannersRepo.create({ ...datos, imagen: nombreImagen });
    return this.bannersRepo.save(banner);
  }

  async actualizar(id: number, datos: ActualizarBannerDto, nombreImagen?: string): Promise<Banner> {
    const banner = await this.obtener(id);

    if (nombreImagen) {
      await this.borrarArchivoImagen(banner.imagen);
      banner.imagen = nombreImagen;
    }

    Object.assign(banner, {
      enlaceUrl: datos.enlaceUrl ?? banner.enlaceUrl,
      orden: datos.orden ?? banner.orden,
    });

    return this.bannersRepo.save(banner);
  }

  async cambiarEstado(id: number, activo: boolean): Promise<Banner> {
    const banner = await this.obtener(id);
    banner.activo = activo;
    return this.bannersRepo.save(banner);
  }

  // A diferencia de categorias/marcas, un banner no tiene nada que lo
  // referencie (ningun producto ni pedido apunta a un banner), asi que
  // siempre se puede borrar fisicamente sin restricciones.
  async eliminar(id: number): Promise<{ mensaje: string }> {
    const banner = await this.obtener(id);
    await this.borrarArchivoImagen(banner.imagen);
    await this.bannersRepo.remove(banner);
    return { mensaje: 'Banner eliminado' };
  }

  private async borrarArchivoImagen(nombreArchivo: string): Promise<void> {
    try {
      await unlink(join(process.cwd(), 'uploads', 'banners', nombreArchivo));
    } catch {
      // Si el archivo ya no esta, no es un error grave: se ignora.
    }
  }
}
