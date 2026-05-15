import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { success } from '../utils/response';

const router = Router();

// GET /api/v1/faqs?page=home
router.get('/faqs', async (req, res) => {
  const { page } = req.query;
  const where = page ? { page: String(page) } : {};
  const faqs = await prisma.fAQ.findMany({ where, orderBy: { sortOrder: 'asc' } });
  return success(res, faqs);
});

// GET /api/v1/testimonials
router.get('/testimonials', async (_req, res) => {
  const testimonials = await prisma.testimonial.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  });
  return success(res, testimonials);
});

// GET /api/v1/broker-latency
router.get('/broker-latency', async (_req, res) => {
  const brokers = await prisma.brokerLatency.findMany({ orderBy: { london: 'asc' } });
  return success(res, brokers);
});

// GET /api/v1/knowledgebase
router.get('/knowledgebase', async (_req, res) => {
  const articles = await prisma.knowledgeArticle.findMany({
    where: { published: true },
    select: { id: true, title: true, slug: true, category: true, views: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return success(res, articles);
});

// GET /api/v1/knowledgebase/search?q=
router.get('/knowledgebase/search', async (req, res) => {
  const q = String(req.query.q || '');
  const articles = await prisma.knowledgeArticle.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, title: true, slug: true, category: true, createdAt: true },
    take: 10,
  });
  return success(res, articles);
});

// GET /api/v1/knowledgebase/:slug
router.get('/knowledgebase/:slug', async (req, res) => {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { slug: req.params.slug },
  });
  if (!article) return res.status(404).json({ success: false, error: 'Article not found' });

  await prisma.knowledgeArticle.update({
    where: { id: article.id },
    data: { views: { increment: 1 } },
  });

  return success(res, article);
});

export default router;
