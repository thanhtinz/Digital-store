// ----------------------------------------------------------------------

function path(root: string, sublink: string) {
  return `${root}${sublink}`;
}

const ROOTS_AUTH = '/auth';
const ROOTS_DASHBOARD = '/dashboard';

// ----------------------------------------------------------------------

export const PATH_AUTH = {
  root: ROOTS_AUTH,
  login: path(ROOTS_AUTH, '/login'),
  register: path(ROOTS_AUTH, '/register'),
  resetPassword: path(ROOTS_AUTH, '/reset-password'),
};

export const PATH_PAGE = {
  comingSoon: '/coming-soon',
  maintenance: '/maintenance',
  pricing: '/pricing',
  payment: '/payment',
  about: '/about-us',
  contact: '/contact-us',
  faqs: '/faqs',
  page403: '/403',
  page404: '/404',
  page500: '/500',
  components: '/components',
};

export const PATH_DASHBOARD = {
  root: ROOTS_DASHBOARD,
  kanban: path(ROOTS_DASHBOARD, '/kanban'),
  calendar: path(ROOTS_DASHBOARD, '/calendar'),
  fileManager: path(ROOTS_DASHBOARD, '/files-manager'),
  permissionDenied: path(ROOTS_DASHBOARD, '/permission-denied'),
  blank: path(ROOTS_DASHBOARD, '/blank'),
  myAccount: path(ROOTS_DASHBOARD, '/profile'),
  general: {
    app: path(ROOTS_DASHBOARD, '/app'),
    ecommerce: path(ROOTS_DASHBOARD, '/ecommerce'),
    analytics: path(ROOTS_DASHBOARD, '/analytics'),
    banking: path(ROOTS_DASHBOARD, '/banking'),
    booking: path(ROOTS_DASHBOARD, '/booking'),
    file: path(ROOTS_DASHBOARD, '/file'),
  },
  mail: {
    root: path(ROOTS_DASHBOARD, '/mail'),
    all: path(ROOTS_DASHBOARD, '/mail/all'),
  },
  chat: {
    root: path(ROOTS_DASHBOARD, '/chat'),
    new: path(ROOTS_DASHBOARD, '/chat/new'),
    view: (name: string) => path(ROOTS_DASHBOARD, `/chat/${name}`),
  },
  orders: {
    root: path(ROOTS_DASHBOARD, '/orders'),
    view: (code: string) => path(ROOTS_DASHBOARD, `/orders/${code}`),
  },
  wallet: {
    topup: path(ROOTS_DASHBOARD, '/wallet/topup'),
    history: path(ROOTS_DASHBOARD, '/wallet/history'),
  },
  wishlist: path(ROOTS_DASHBOARD, '/wishlist'),
  downloads: path(ROOTS_DASHBOARD, '/downloads'),
  affiliate: path(ROOTS_DASHBOARD, '/affiliate'),
  admin: {
    root: path(ROOTS_DASHBOARD, '/admin'),
    settings: path(ROOTS_DASHBOARD, '/admin/settings'),
    users: path(ROOTS_DASHBOARD, '/admin/users'),
    orders: path(ROOTS_DASHBOARD, '/admin/orders'),
    products: path(ROOTS_DASHBOARD, '/admin/products'),
    categories: path(ROOTS_DASHBOARD, '/admin/categories'),
    smm: path(ROOTS_DASHBOARD, '/admin/smm'),
    marketing: path(ROOTS_DASHBOARD, '/admin/marketing'),
    blog: path(ROOTS_DASHBOARD, '/admin/blog'),
    support: path(ROOTS_DASHBOARD, '/admin/support'),
    affiliate: path(ROOTS_DASHBOARD, '/admin/affiliate'),
    rewards: path(ROOTS_DASHBOARD, '/admin/rewards'),
    integrations: path(ROOTS_DASHBOARD, '/admin/integrations'),
    badges: path(ROOTS_DASHBOARD, '/admin/badges'),
    wheel: path(ROOTS_DASHBOARD, '/admin/wheel'),
    bundles: path(ROOTS_DASHBOARD, '/admin/bundles'),
    questions: path(ROOTS_DASHBOARD, '/admin/questions'),
  },
  smm: {
    root: path(ROOTS_DASHBOARD, '/smm'),
    order: path(ROOTS_DASHBOARD, '/smm/order'),
    services: path(ROOTS_DASHBOARD, '/smm/services'),
    orders: path(ROOTS_DASHBOARD, '/smm/orders'),
    warranty: path(ROOTS_DASHBOARD, '/smm/warranty'),
  },
  support: path(ROOTS_DASHBOARD, '/support'),
  offers: path(ROOTS_DASHBOARD, '/offers'),
  flashSale: path(ROOTS_DASHBOARD, '/flash-sale'),
  rewards: path(ROOTS_DASHBOARD, '/rewards'),
  wheel: path(ROOTS_DASHBOARD, '/wheel'),
  bundles: path(ROOTS_DASHBOARD, '/bundles'),
  bundle: (slug: string) => path(ROOTS_DASHBOARD, `/bundles/${slug}`),
  subscriptions: path(ROOTS_DASHBOARD, '/subscriptions'),
  user: {
    root: path(ROOTS_DASHBOARD, '/user'),
    new: path(ROOTS_DASHBOARD, '/user/new'),
    list: path(ROOTS_DASHBOARD, '/user/list'),
    cards: path(ROOTS_DASHBOARD, '/user/cards'),
    profile: path(ROOTS_DASHBOARD, '/user/profile'),
    account: path(ROOTS_DASHBOARD, '/user/account'),
    edit: (name: string) => path(ROOTS_DASHBOARD, `/user/${name}/edit`),
    demoEdit: path(ROOTS_DASHBOARD, `/user/reece-chung/edit`),
  },
  eCommerce: {
    root: path(ROOTS_DASHBOARD, '/e-commerce'),
    shop: path(ROOTS_DASHBOARD, '/e-commerce/shop'),
    list: path(ROOTS_DASHBOARD, '/e-commerce/list'),
    checkout: path(ROOTS_DASHBOARD, '/e-commerce/checkout'),
    view: (name: string) => path(ROOTS_DASHBOARD, `/e-commerce/product/${name}`),
  },
  invoice: {
    root: path(ROOTS_DASHBOARD, '/invoice'),
    list: path(ROOTS_DASHBOARD, '/invoice/list'),
    new: path(ROOTS_DASHBOARD, '/invoice/new'),
    view: (id: string) => path(ROOTS_DASHBOARD, `/invoice/${id}`),
    edit: (id: string) => path(ROOTS_DASHBOARD, `/invoice/${id}/edit`),
    demoEdit: path(ROOTS_DASHBOARD, '/invoice/e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1/edit'),
    demoView: path(ROOTS_DASHBOARD, '/invoice/e99f09a7-dd88-49d5-b1c8-1daf80c2d7b5'),
  },
  blog: {
    root: path(ROOTS_DASHBOARD, '/blog'),
    posts: path(ROOTS_DASHBOARD, '/blog/posts'),
    new: path(ROOTS_DASHBOARD, '/blog/new'),
    view: (title: string) => path(ROOTS_DASHBOARD, `/blog/post/${title}`),
    demoView: path(ROOTS_DASHBOARD, '/blog/post/apply-these-7-secret-techniques-to-improve-event'),
  },
};

export const PATH_DOCS = {
  root: '#',
  changelog: '#',
};
