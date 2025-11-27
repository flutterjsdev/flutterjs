// ============================================================================
// SEO MANAGER - Search Engine Optimization & Meta Tags
// Handles: Meta tags, Open Graph, Twitter Cards, Structured Data, Sitemap
// ============================================================================

/**
 * SEO Manager - Optimize app for search engines
 */
class SEOManager {
  /**
   * Initialize SEO for app
   */
  static init(options = {}) {
    this.config = {
      baseUrl: '',
      defaultTitle: 'My App',
      defaultDescription: 'A web application built with FlutterJS',
      defaultImage: '/og-image.png',
      defaultKeywords: ['flutter', 'web', 'javascript'],
      twitterHandle: '',
      language: 'en',
      ...options
    };

    this.routeMetadata = new Map();
    this.schemaMarkup = [];
  }

  /**
   * Set metadata for current page
   *
   * Usage:
   * SEOManager.setPageMeta({
   *   title: 'Product Page',
   *   description: 'Buy our products',
   *   keywords: ['products', 'shop'],
   *   ogImage: '/product-og.png',
   *   canonical: 'https://example.com/products'
   * });
   */
  static setPageMeta(meta) {
    const {
      title = this.config.defaultTitle,
      description = this.config.defaultDescription,
      keywords = this.config.defaultKeywords,
      ogImage = this.config.defaultImage,
      ogType = 'website',
      canonical = null,
      noindex = false,
      nofollow = false,
      robots = null
    } = meta;

    // Update title
    document.title = title;

    // Update/create meta tags
    this.setMetaTag('description', description);
    this.setMetaTag('keywords', keywords.join(', '));

    // Open Graph
    this.setMetaTag('og:title', title, 'property');
    this.setMetaTag('og:description', description, 'property');
    this.setMetaTag('og:image', ogImage, 'property');
    this.setMetaTag('og:type', ogType, 'property');
    this.setMetaTag('og:url', window.location.href, 'property');

    // Canonical
    if (canonical) {
      this.setCanonical(canonical);
    } else {
      this.setCanonical(window.location.href);
    }

    // Robots meta
    const robotsValue = robots || [
      noindex ? 'noindex' : 'index',
      nofollow ? 'nofollow' : 'follow'
    ].join(', ');
    this.setMetaTag('robots', robotsValue);

    return {
      title,
      description,
      keywords,
      ogImage,
      canonical: canonical || window.location.href
    };
  }

  /**
   * Set meta tag (create or update)
   */
  static setMetaTag(name, content, attribute = 'name') {
    let tag = document.querySelector(`meta[${attribute}="${name}"]`);

    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attribute, name);
      document.head.appendChild(tag);
    }

    tag.setAttribute('content', content);
  }

  /**
   * Set canonical URL
   */
  static setCanonical(url) {
    let link = document.querySelector('link[rel="canonical"]');

    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }

    link.href = url;
  }

  /**
   * Set Twitter Card metadata
   */
  static setTwitterCard(meta) {
    const {
      cardType = 'summary',
      title = this.config.defaultTitle,
      description = this.config.defaultDescription,
      image = this.config.defaultImage,
      creator = this.config.twitterHandle,
      site = this.config.twitterHandle
    } = meta;

    this.setMetaTag('twitter:card', cardType);
    this.setMetaTag('twitter:title', title);
    this.setMetaTag('twitter:description', description);
    this.setMetaTag('twitter:image', image);

    if (creator) {
      this.setMetaTag('twitter:creator', creator);
    }

    if (site) {
      this.setMetaTag('twitter:site', site);
    }
  }

  /**
   * Add structured data (JSON-LD)
   */
  static addStructuredData(data) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);

    this.schemaMarkup.push(data);
    return script;
  }

  /**
   * Add organization structured data
   */
  static addOrganizationSchema(org) {
    const {
      name,
      url,
      logo,
      description,
      email,
      phone,
      address,
      socials = []
    } = org;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name,
      url,
      logo,
      description,
      contact: {
        '@type': 'ContactPoint',
        contactType: 'Customer Service',
        ...(email && { email }),
        ...(phone && { telephone: phone })
      },
      ...(address && { address }),
      sameAs: socials
    };

    return this.addStructuredData(schema);
  }

  /**
   * Add product structured data
   */
  static addProductSchema(product) {
    const {
      name,
      description,
      image,
      price,
      currency = 'USD',
      availability = 'https://schema.org/InStock',
      rating = null,
      ratingCount = 0,
      url = window.location.href
    } = product;

    const schema = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name,
      description,
      image,
      url,
      offers: {
        '@type': 'Offer',
        price,
        priceCurrency: currency,
        availability,
        url
      },
      ...(rating && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: rating,
          ratingCount
        }
      })
    };

    return this.addStructuredData(schema);
  }

  /**
   * Add breadcrumb structured data
   */
  static addBreadcrumbs(items) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    };

    return this.addStructuredData(schema);
  }

  /**
   * Generate sitemap XML
   */
  static generateSitemap(pages) {
    const baseUrl = this.config.baseUrl;

    const urls = pages.map(page => {
      const {
        url,
        lastModified = new Date().toISOString(),
        changeFrequency = 'weekly',
        priority = 0.8
      } = page;

      return `  <url>
    <loc>${this.escapeXml(baseUrl + url)}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  }

  /**
   * Generate robots.txt
   */
  static generateRobotsTxt(rules = []) {
    const defaultRules = [
      'User-agent: *',
      'Allow: /',
      `Sitemap: ${this.config.baseUrl}/sitemap.xml`,
      '',
      'User-agent: AdsBot-Google',
      'Allow: /',
      '',
      'User-agent: Googlebot-Image',
      'Allow: /'
    ];

    const customRules = rules.map(rule => {
      const { userAgent = '*', allow = [], disallow = [] } = rule;
      return [
        `User-agent: ${userAgent}`,
        ...allow.map(path => `Allow: ${path}`),
        ...disallow.map(path => `Disallow: ${path}`)
      ].join('\n');
    });

    return [...defaultRules, ...customRules].join('\n');
  }

  /**
   * Add Open Graph article metadata
   */
  static setArticleMeta(article) {
    const {
      title,
      description,
      image,
      author,
      publishedDate,
      modifiedDate,
      tags = []
    } = article;

    this.setPageMeta({
      title,
      description,
      ogImage: image,
      ogType: 'article'
    });

    this.setMetaTag('article:author', author, 'property');
    this.setMetaTag('article:published_time', publishedDate, 'property');
    this.setMetaTag('article:modified_time', modifiedDate, 'property');

    tags.forEach(tag => {
      const tagMeta = document.createElement('meta');
      tagMeta.setAttribute('property', 'article:tag');
      tagMeta.setAttribute('content', tag);
      document.head.appendChild(tagMeta);
    });
  }

  /**
   * Set focus keywords for SEO analysis
   */
  static analyzeSEO(focusKeyword) {
    const title = document.title;
    const description = document.querySelector('meta[name="description"]')?.content || '';
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent);
    const bodyText = document.body.innerText;

    const focusKeywordLower = focusKeyword.toLowerCase();
    const titleHasKeyword = title.toLowerCase().includes(focusKeywordLower);
    const descriptionHasKeyword = description.toLowerCase().includes(focusKeywordLower);
    const headingHasKeyword = headings.some(h => h.toLowerCase().includes(focusKeywordLower));

    const keywordDensity = (bodyText.toLowerCase().match(new RegExp(focusKeywordLower, 'g')) || []).length / bodyText.split(' ').length;

    return {
      focusKeyword,
      score: this.calculateSEOScore({
        titleHasKeyword,
        descriptionHasKeyword,
        headingHasKeyword,
        keywordDensity
      }),
      analysis: {
        titleHasKeyword,
        descriptionHasKeyword,
        headingHasKeyword,
        keywordDensity: (keywordDensity * 100).toFixed(2) + '%',
        h1Count: Array.from(document.querySelectorAll('h1')).length,
        readabilityScore: this.calculateReadability(),
        internalLinks: Array.from(document.querySelectorAll('a[href^="/"]')).length,
        externalLinks: Array.from(document.querySelectorAll('a[href^="http"]')).length,
        images: Array.from(document.querySelectorAll('img')).length,
        imagesWithAlt: Array.from(document.querySelectorAll('img[alt]')).length
      }
    };
  }

  /**
   * Calculate SEO score (0-100)
   */
  static calculateSEOScore(factors) {
    let score = 0;

    if (factors.titleHasKeyword) score += 25;
    if (factors.descriptionHasKeyword) score += 25;
    if (factors.headingHasKeyword) score += 25;

    // Keyword density: ideal 1-3%
    if (factors.keywordDensity >= 0.01 && factors.keywordDensity <= 0.03) {
      score += 25;
    } else if (factors.keywordDensity > 0 && factors.keywordDensity < 0.05) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate readability score (Flesch Reading Ease)
   */
  static calculateReadability() {
    const text = document.body.innerText;
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const syllables = this.countSyllables(text);

    const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Count syllables in text (approximation)
   */
  static countSyllables(text) {
    const sylCount = text.toLowerCase().match(/[aeiou]{1,2}/g);
    return sylCount ? sylCount.length : 0;
  }

  /**
   * Escape XML special characters
   */
  static escapeXml(str) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;'
    };
    return String(str).replace(/[&<>"']/g, c => map[c]);
  }

  /**
   * Generate preload hints for performance
   */
  static addPreloadHints(resources) {
    resources.forEach(({ url, as = 'script', crossorigin = false }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = as;
      link.href = url;
      if (crossorigin) link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  /**
   * Add DNS prefetch for external resources
   */
  static addDnsPrefetch(domains) {
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = '//' + domain;
      document.head.appendChild(link);
    });
  }
}

export { SEOManager };