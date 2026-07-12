import type { APIRoute } from 'astro';
import { claims } from '../data/claims';
import { concerns } from '../data/concerns';

const origin = 'https://elpaisestafatal.es';
const urls = ['/', '/buscar', '/afirmaciones', '/investigaciones', '/acerca-de', '/metodologia', '/fuentes', '/revisiones', '/privacidad', ...claims.map((item) => `/afirmaciones/${item.slug}`), ...concerns.map((item) => `/preocupaciones/${item.slug}`)];
export const GET: APIRoute = () => new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${origin}${url}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
