/**
 * Unit tests — the school photo.
 *
 * Sampai 2026-09-25 halaman Tentang menampilkan placeholder yang berbunyi
 * "FOTO SEKOLAH — UNGGAH MELALUI DASBOR", tetapi **tidak ada** tempat mengunggah
 * di dasbor: model `SchoolProfile` tidak punya kolom gambar sama sekali, dan
 * berkas yang tampil adalah `public/images/hero.svg` yang ditulis langsung di
 * JSX. Pemilik mencarinya dan tidak menemukannya — memang tidak ada.
 *
 * Uji di berkas ini menjaga tiga hal yang tidak saling menggantikan:
 *
 *   1. `db:seed` berjalan pada **setiap** deploy. Kalau blok `update` profil
 *      menyentuh kolom gambar, foto yang baru diunggah pemilik terhapus pada
 *      deploy berikutnya — tanpa galat, tanpa jejak. Itu kerugian yang paling
 *      mahal di sini, jadi ia dijaga lebih dulu.
 *   2. Halaman memakai foto unggahan bila ada, dan jatuh ke placeholder bila
 *      belum ada — bukan menampilkan gambar rusak.
 *   3. Alt text tidak mengklaim sesuatu yang tidak ada. Placeholder bukan foto,
 *      jadi alt-nya kosong.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { defaultSchoolProfile } from '../src/data/defaults';
import { code } from './source';

describe('foto sekolah tidak terhapus oleh seed', () => {
  /**
   * Blok `update` milik `seedSchoolProfile()`, diambil dari sumber.
   *
   * `[\s\S]*?\n\}` berhenti pada `}` pertama yang berada di kolom 0 — di berkas
   * ini hanya penutup fungsi, karena isinya menjorok. Kurung kurawal yang
   * menjorok tidak cocok.
   */
  function profileUpdateBlock(): string {
    const seed = code('prisma/seed.ts');
    const fn = seed.match(/async function seedSchoolProfile\(\)[\s\S]*?\n\}/)?.[0] ?? '';
    assert.ok(fn, 'seedSchoolProfile() tidak ditemukan — kalau namanya berubah, perbarui uji ini');

    const block = fn.match(/update:\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    assert.ok(block.trim().length > 0, 'blok update profil harus terbaca, bukan string kosong');
    return block;
  }

  it('blok update profil tidak menyentuh kolom gambar', () => {
    const block = profileUpdateBlock();

    assert.doesNotMatch(
      block,
      /image/i,
      'seed berjalan pada setiap deploy. Kalau blok `update` menyentuh kolom gambar, ' +
        'foto yang diunggah pemilik hilang pada deploy berikutnya — diam-diam, tanpa galat. ' +
        'Kolom gambar hanya boleh ada di blok `create`.',
    );
  });

  it('menjaga kolom yang boleh ditimpa seed, supaya uji di atas tidak hampa', () => {
    // Tanpa pemeriksaan ini, blok yang gagal terbaca (string kosong) akan lolos
    // uji sebelumnya. Kolom identitas memang boleh ditimpa; gambar tidak.
    const block = profileUpdateBlock();
    assert.match(block, /schoolName/, 'blok update harus benar-benar terbaca isinya');
  });
});

describe('default profil tidak berpura-pura punya foto', () => {
  it('mulai dengan gambar kosong', () => {
    // Kosong berarti halaman memakai placeholder yang jujur. Mengisinya dengan
    // berkas contoh akan membuat situs baru tampak sudah difoto.
    assert.equal(defaultSchoolProfile.image, '');
    assert.equal(defaultSchoolProfile.imagePublicId, '');
  });
});

describe('halaman Tentang memakai foto unggahan', () => {
  const page = code('src/app/(situs)/tentang/page.tsx');

  it('memakai profile.image dan jatuh ke placeholder', () => {
    assert.match(
      page,
      /src=\{profile\.image \|\| '\/images\/hero\.svg'\}/,
      'gambar harus memakai foto unggahan bila ada, dan placeholder bila kosong',
    );
  });

  it('tidak memakai berkas placeholder secara mutlak lagi', () => {
    assert.doesNotMatch(
      page,
      /src="\/images\/hero\.svg"/,
      'placeholder tidak boleh ditulis sebagai src tetap — itu bug yang membuat ' +
        'halaman menjanjikan unggahan yang tidak pernah bisa tampil',
    );
  });

  it('alt hanya menyebut foto bila fotonya memang ada', () => {
    assert.match(
      page,
      /alt=\{profile\.image \? `Foto \$\{profile\.schoolName\}` : ''\}/,
      'alt yang mendeskripsikan "foto" padahal yang tampil placeholder adalah klaim palsu ' +
        'kepada setiap pembaca layar',
    );
  });
});

describe('pratinjau tautan memakai foto yang sama', () => {
  const layout = code('src/app/layout.tsx');

  it('openGraph memakai foto unggahan bila ada', () => {
    assert.match(layout, /profile\.image\s*\n?\s*\?\s*\{ url: profile\.image/, 'openGraph harus memakai foto unggahan');
    assert.match(layout, /: \{ url: '\/images\/hero\.svg'/, 'openGraph harus jatuh ke placeholder');
  });

  it('twitter memakai foto yang sama, bukan selalu placeholder', () => {
    assert.match(
      layout,
      /images: \[profile\.image \|\| '\/images\/hero\.svg'\]/,
      'kartu twitter harus memakai foto yang sama dengan openGraph',
    );
  });
});

describe('dasbor menyediakan tempat mengunggahnya', () => {
  const form = code('src/components/admin/managers/SchoolProfileForm.tsx');

  it('memasang ImageUploadField name="image"', () => {
    // Nama `image` bukan pilihan bebas: `tests/media.test.ts` mencocokkan nama
    // ini dengan pembacaan `imagePublicId` di content-actions.ts, dan hitungannya
    // harus sama. Mengganti nama di sini memerahkan uji itu.
    assert.match(
      form,
      /<ImageUploadField[\s\S]{0,200}?name="image"/,
      'form profil harus punya kolom unggah foto sekolah',
    );
  });

  it('meneruskan gambar yang tersimpan supaya tidak terlihat kosong saat diubah', () => {
    assert.match(form, /defaultUrl=\{profile\.image\}/, 'foto yang sudah ada harus tampil di form');
    assert.match(
      form,
      /defaultPublicId=\{profile\.imagePublicId\}/,
      'id aset harus diteruskan, kalau tidak setiap penyimpanan menganggap fotonya baru',
    );
  });
});
