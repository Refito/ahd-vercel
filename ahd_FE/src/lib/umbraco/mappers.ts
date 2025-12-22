import type { Post } from '~/types';
import type { UmbracoItem } from './types';

type BlogProps = {
  title?: string;
  excerpt?: string;
  mainImage?: { url?: string } | string;
  publishDate?: string;
  updateDate?: string;
  slug?: string;
  category?: string;
  tags?: string[];
  author?: string;
  content?: string;
};

export function mapUmbracoBlogToPost(item: UmbracoItem<BlogProps>): Post {
  const image =
    typeof item.properties.mainImage === 'string' ? item.properties.mainImage : item.properties.mainImage?.url;

  return {
    id: item.id,
    slug: item.properties.slug || item.route?.path?.replace(/^\//, '') || item.id,
    permalink: item.route?.path || `/${item.properties.slug || item.id}`,
    publishDate: new Date(item.properties.publishDate || item.createDate),
    updateDate: item.properties.updateDate ? new Date(item.properties.updateDate) : undefined,
    title: item.properties.title || item.name,
    excerpt: item.properties.excerpt,
    image,
    category: item.properties.category
      ? { slug: item.properties.category, title: item.properties.category }
      : undefined,
    tags: (item.properties.tags || []).map((t) => ({ slug: t, title: t })),
    author: item.properties.author,
    metadata: undefined,
    draft: false,
    content: item.properties.content,
    readingTime: undefined,
  };
}

export type HeaderData = {
  logoUrl?: string;
  links?: Array<{ text: string; href: string }>;
};

export function mapUmbracoHeader(
  item: UmbracoItem<{ headerLogo?: { url?: string } | string; links?: { text: string; href: string }[] }>
): HeaderData {
  const logoUrl =
    typeof item.properties.headerLogo === 'string' ? item.properties.headerLogo : item.properties.headerLogo?.url;
  return { logoUrl, links: item.properties.links || [] };
}
