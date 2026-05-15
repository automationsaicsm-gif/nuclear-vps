import { PrismaClient, PlanCategory, Location } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Plans
  const plans = [
    {
      name: 'Bronze VPS',
      slug: 'bronze-vps',
      category: PlanCategory.TRADING_VPS,
      monthlyPrice: 24.9,
      quarterlyPrice: 23.45,
      annualPrice: 20.75,
      ram: '2 GB DDR5',
      cpu: '2 GHz',
      storage: '30 GB NVMe SSD',
      platforms: 3,
      os: ['Windows 2022', 'Windows 2019', 'Windows 2016'],
      linuxAvailable: false,
      featured: false,
      available: true,
      sortOrder: 1,
    },
    {
      name: 'Silver VPS',
      slug: 'silver-vps',
      category: PlanCategory.TRADING_VPS,
      monthlyPrice: 48.9,
      quarterlyPrice: 45.97,
      annualPrice: 40.75,
      ram: '4 GB DDR5',
      cpu: '3 GHz',
      storage: '50 GB NVMe SSD',
      platforms: 6,
      os: ['Windows 2022', 'Windows 2019', 'Windows 2016'],
      linuxAvailable: false,
      featured: true,
      available: true,
      sortOrder: 2,
    },
    {
      name: 'Gold VPS',
      slug: 'gold-vps',
      category: PlanCategory.TRADING_VPS,
      monthlyPrice: 74.9,
      quarterlyPrice: 70.41,
      annualPrice: 62.5,
      ram: '6 GB DDR5',
      cpu: '4 GHz',
      storage: '75 GB NVMe SSD',
      platforms: 10,
      os: ['Windows 2022', 'Windows 2019', 'Windows 2016'],
      linuxAvailable: false,
      featured: false,
      available: true,
      sortOrder: 3,
    },
    {
      name: 'Server 7700',
      slug: 'server-7700',
      category: PlanCategory.TRADING_SERVER,
      monthlyPrice: 250,
      quarterlyPrice: 235,
      annualPrice: 208.33,
      ram: '64 GB DDR5',
      cpu: 'Ryzen 7700 8/16 Core 5.4GHz',
      storage: '2TB NVMe SSD',
      platforms: 9999,
      os: ['Windows 2022', 'Windows 2019', 'Windows 2016', 'Linux'],
      linuxAvailable: true,
      featured: false,
      available: true,
      sortOrder: 4,
    },
    {
      name: 'Server 7950X3D',
      slug: 'server-7950x3d',
      category: PlanCategory.TRADING_SERVER,
      monthlyPrice: 450,
      quarterlyPrice: 423,
      annualPrice: 375,
      ram: '128 GB DDR5',
      cpu: 'Ryzen 7950X3D 16/32 Core 5.7GHz',
      storage: '4TB NVMe SSD',
      platforms: 9999,
      os: ['Windows 2022', 'Windows 2019', 'Windows 2016', 'Linux'],
      linuxAvailable: true,
      featured: true,
      available: true,
      sortOrder: 5,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }
  console.log('Plans seeded.');

  // Testimonials
  const testimonials = [
    {
      name: 'Heinz',
      handle: '@sicforex',
      company: 'Founder @sicforex',
      content:
        'Stable performance, low latency, responsive support. Reliable choice for serious traders.',
      rating: 5,
      active: true,
      sortOrder: 1,
    },
    {
      name: 'Botond Ratonyi',
      handle: '@TheNomadTrader',
      company: 'Founder @TheNomadTrader',
      content:
        'Game changer for my trading. Reliability gives peace of mind while traveling the world.',
      rating: 5,
      active: true,
      sortOrder: 2,
    },
    {
      name: 'Joseph J. Purser',
      handle: null,
      company: 'Geranio forex srl',
      content:
        'Win percentage doubled since upgrade. Easy setup, no waiting on hold.',
      rating: 5,
      active: true,
      sortOrder: 3,
    },
    {
      name: 'Cayden Porter',
      handle: null,
      company: 'Algorithmup Ltd',
      content:
        'Great investment. State of the art servers and dedicated customer service.',
      rating: 5,
      active: true,
      sortOrder: 4,
    },
    {
      name: 'Robert Johanson',
      handle: null,
      company: 'Sunflower Fund LLC',
      content:
        'Used for over a year. Best uptime, lightning fast. Highly recommend.',
      rating: 5,
      active: true,
      sortOrder: 5,
    },
    {
      name: 'Maria Garcia',
      handle: null,
      company: 'Expert in Latency Arbitrage',
      content:
        'Execution speed is impressively fast. Perfect for latency arbitrage trading.',
      rating: 5,
      active: true,
      sortOrder: 6,
    },
  ];

  for (let i = 0; i < testimonials.length; i++) {
    const t = testimonials[i];
    const existing = await prisma.testimonial.findFirst({
      where: { name: t.name },
    });
    if (!existing) {
      await prisma.testimonial.create({ data: t });
    }
  }
  console.log('Testimonials seeded.');

  // FAQs
  const faqs = [
    {
      question: 'What is a Nuclear VPS?',
      answer:
        'A Nuclear VPS is a constantly powered-on virtual Windows desktop, connected to the internet 24/7. Install trading platforms and run EAs, Robots, and automated systems without interruption.',
      category: 'general',
      page: 'home',
      sortOrder: 1,
    },
    {
      question: 'Is Nuclear VPS difficult to use?',
      answer:
        'No special skills needed. Connect via the pre-installed RDP app from any device. Our support team is always ready to help.',
      category: 'general',
      page: 'home',
      sortOrder: 2,
    },
    {
      question: 'What payment methods can I use?',
      answer:
        'Credit/Debit Cards, PayPal, and Cryptocurrency. Cards and PayPal support auto-renewal subscriptions. You can also add credit to your account for future payments.',
      category: 'billing',
      page: 'home',
      sortOrder: 3,
    },
    {
      question: 'What location should I select?',
      answer:
        "Choose the location closest to your broker's servers. Check our Broker Latency page or ask your broker directly. Most brokers are based in London.",
      category: 'general',
      page: 'home',
      sortOrder: 4,
    },
    {
      question: 'When will I receive my VPS?',
      answer:
        'Immediately. VPS is delivered automatically within minutes. Windows installation may take up to 10 minutes. Credentials are sent to your email — check spam if not received.',
      category: 'general',
      page: 'home',
      sortOrder: 5,
    },
    {
      question: 'Can I connect from a smartphone or computer?',
      answer:
        'Yes. Connect from Windows, Mac, iOS, Android, and Chrome OS using the RDP app. Guides available in our Knowledgebase.',
      category: 'general',
      page: 'home',
      sortOrder: 6,
    },
  ];

  for (const faq of faqs) {
    const existing = await prisma.fAQ.findFirst({
      where: { question: faq.question },
    });
    if (!existing) {
      await prisma.fAQ.create({ data: faq });
    }
  }
  console.log('FAQs seeded.');

  // Broker Latency
  const brokers = [
    { broker: 'IC Markets', london: 1, newYork: 89, recommended: Location.LONDON },
    { broker: 'Pepperstone', london: 3, newYork: 86, recommended: Location.LONDON },
    { broker: 'FXCM', london: 5, newYork: 82, recommended: Location.LONDON },
    { broker: 'Exness', london: 8, newYork: 92, recommended: Location.LONDON },
    { broker: 'XM', london: 4, newYork: 85, recommended: Location.LONDON },
    { broker: 'OANDA', london: 12, newYork: 45, recommended: Location.NEW_YORK },
    { broker: 'IG', london: 6, newYork: 78, recommended: Location.LONDON },
    { broker: 'CMC Markets', london: 7, newYork: 74, recommended: Location.LONDON },
    { broker: 'Saxo', london: 9, newYork: 68, recommended: Location.LONDON },
    { broker: 'Interactive Brokers', london: 15, newYork: 12, recommended: Location.NEW_YORK },
    { broker: 'TD Ameritrade', london: 88, newYork: 18, recommended: Location.NEW_YORK },
    { broker: 'Schwab', london: 91, newYork: 15, recommended: Location.NEW_YORK },
    { broker: 'Darwinex', london: 8, newYork: 95, recommended: Location.LONDON },
    { broker: 'Admiral Markets', london: 5, newYork: 88, recommended: Location.LONDON },
    { broker: 'HotForex', london: 3, newYork: 84, recommended: Location.LONDON },
    { broker: 'Tickmill', london: 2, newYork: 91, recommended: Location.LONDON },
    { broker: 'FXTM', london: 6, newYork: 87, recommended: Location.LONDON },
    { broker: 'RoboForex', london: 11, newYork: 78, recommended: Location.LONDON },
    { broker: 'EasyMarkets', london: 9, newYork: 81, recommended: Location.LONDON },
    { broker: 'Plus500', london: 7, newYork: 76, recommended: Location.LONDON },
  ];

  for (const b of brokers) {
    const existing = await prisma.brokerLatency.findFirst({
      where: { broker: b.broker },
    });
    if (existing) {
      await prisma.brokerLatency.update({
        where: { id: existing.id },
        data: b,
      });
    } else {
      await prisma.brokerLatency.create({ data: b });
    }
  }
  console.log('Broker latency seeded.');

  // Knowledge Articles
  const articles = [
    {
      title: 'How to Connect to Your VPS from Windows',
      slug: 'connect-vps-windows',
      content: `# How to Connect to Your VPS from Windows

## Prerequisites
- Your VPS credentials (IP address, username, password) from your welcome email
- Windows Remote Desktop Connection (pre-installed on all Windows versions)

## Steps

1. Press **Windows + R** to open the Run dialog
2. Type \`mstsc\` and press Enter
3. Enter your VPS IP address in the "Computer" field
4. Click **Connect**
5. Enter your username (\`Administrator\`) and password
6. Click **OK**

## Troubleshooting
- If you can't connect, check that your VPS is running in your dashboard
- Ensure you're entering the correct IP address
- Try disabling your firewall temporarily to test connectivity`,
      category: 'Getting Started',
      published: true,
    },
    {
      title: 'How to Connect to Your VPS from Mac',
      slug: 'connect-vps-mac',
      content: `# How to Connect to Your VPS from Mac

## Prerequisites
- Microsoft Remote Desktop app (free from Mac App Store)
- Your VPS credentials from your welcome email

## Steps

1. Download **Microsoft Remote Desktop** from the Mac App Store
2. Open the app and click the **+** button
3. Select **Add PC**
4. Enter your VPS IP address
5. Enter your username and password
6. Click **Add** then double-click to connect`,
      category: 'Getting Started',
      published: true,
    },
    {
      title: 'How to Connect from iPhone or Android',
      slug: 'connect-vps-mobile',
      content: `# How to Connect from iPhone or Android

## iOS (iPhone/iPad)
1. Download **Microsoft Remote Desktop** from the App Store
2. Tap the **+** icon
3. Enter your VPS IP address, username, and password
4. Tap **Save** then tap to connect

## Android
1. Download **Microsoft Remote Desktop** from Google Play
2. Tap **+** > **Add PC**
3. Enter your VPS IP address
4. Add your credentials and connect`,
      category: 'Getting Started',
      published: true,
    },
    {
      title: 'How to Optimize MetaTrader 4/5 on Your VPS',
      slug: 'optimize-metatrader-vps',
      content: `# How to Optimize MetaTrader 4/5 on Your VPS

## Reduce Resource Usage
1. Disable chart display when not needed
2. Reduce the number of open charts
3. Set chart refresh rate to minimum

## Expert Advisor Settings
1. Ensure "Allow live trading" is checked in EA settings
2. Set "Max bars in history" to 10000
3. Enable "Allow DLL imports" only if your EA requires it

## Connection Settings
- MetaTrader auto-connects; no additional configuration needed
- If disconnected, check VPS network status in your dashboard`,
      category: 'Optimization',
      published: true,
    },
    {
      title: 'How to Monitor VPS Resources',
      slug: 'monitor-vps-resources',
      content: `# How to Monitor VPS Resources

## Using Task Manager
1. Press **Ctrl + Shift + Esc** inside your VPS
2. Check CPU, Memory, and Disk usage
3. Close unused applications if resources are high

## Performance Tips
- Keep RAM usage below 80%
- Monitor disk space regularly
- Restart MetaTrader weekly for optimal performance

## Dashboard Monitoring
Your Nuclear VPS dashboard shows:
- VPS status (Online/Offline)
- Next billing date
- Quick restart options`,
      category: 'Optimization',
      published: true,
    },
  ];

  for (const article of articles) {
    await prisma.knowledgeArticle.upsert({
      where: { slug: article.slug },
      update: article,
      create: article,
    });
  }
  console.log('Knowledge articles seeded.');

  // Admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@nuclearvps.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        firstName: 'Admin',
        lastName: 'User',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        emailVerified: true,
        affiliateCode: 'ADMIN0',
      },
    });
    console.log(`Admin user created: ${adminEmail}`);
  }

  // Default site settings
  const settings = [
    { key: 'site_name', value: 'Nuclear VPS' },
    { key: 'site_url', value: 'https://nuclearvps.com' },
    { key: 'contact_email', value: 'support@nuclearvps.com' },
    { key: 'maintenance_mode', value: 'false' },
    { key: 'affiliate_commission_rate', value: '0.15' },
  ];

  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('Site settings seeded.');

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
