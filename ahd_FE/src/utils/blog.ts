import type { PaginateFunction } from 'astro';
import type { Post } from '~/types';
import { APP_BLOG } from 'astrowind:config';
import { cleanSlug, trimSlash, BLOG_BASE, POST_PERMALINK_PATTERN, CATEGORY_BASE, TAG_BASE } from './permalinks';
import { getBlogPage } from '~/lib/umbraco/queries';
import { stripHtml, decodeEntities } from '~/utils/text';

/**
 * Rewrite relative media links in Umbraco rich text HTML to absolute URLs
 * so that <img>, <source>, and <a> pointing to "/media/..." resolve correctly.
 */
function absolutizeUmbracoMediaUrls(html: string | undefined): string | undefined {
  if (!html) return html;
  const base = import.meta.env.PUBLIC_UMBRACO_BASE_URL as string | undefined;
  if (!base) return html;

  // Rewrite attributes src/srcset/href/data-src that start with "/"
  const attrPattern = /(src|srcset|href|data-src)=(['"])(\/[^'"\s>]+)\2/gi;
  const withAttrs = html.replace(attrPattern, (_m, attr: string, quote: string, path: string) => {
    try {
      const abs = new URL(path, base).toString();
      return `${attr}=${quote}${abs}${quote}`;
    } catch {
      return _m;
    }
  });

  // Rewrite inline CSS url(/...)
  const cssUrlPattern = /url\(\s*(['"])?(\/[^)'"\s]+)\1?\s*\)/gi;
  const withCss = withAttrs.replace(cssUrlPattern, (_m, _q: string | undefined, path: string) => {
    try {
      const abs = new URL(path, base).toString();
      return `url(${abs})`;
    } catch {
      return _m;
    }
  });

  return withCss;
}

const generatePermalink = async ({
  id,
  slug,
  publishDate,
  category,
}: {
  id: string;
  slug: string;
  publishDate: Date;
  category: string | undefined;
}) => {
  const year = String(publishDate.getFullYear()).padStart(4, '0');
  const month = String(publishDate.getMonth() + 1).padStart(2, '0');
  const day = String(publishDate.getDate()).padStart(2, '0');
  const hour = String(publishDate.getHours()).padStart(2, '0');
  const minute = String(publishDate.getMinutes()).padStart(2, '0');
  const second = String(publishDate.getSeconds()).padStart(2, '0');

  const permalink = POST_PERMALINK_PATTERN.replace('%slug%', slug)
    .replace('%id%', id)
    .replace('%category%', category || '')
    .replace('%year%', year)
    .replace('%month%', month)
    .replace('%day%', day)
    .replace('%hour%', hour)
    .replace('%minute%', minute)
    .replace('%second%', second);

  return permalink
    .split('/')
    .map((el) => trimSlash(el))
    .filter((el) => !!el)
    .join('/');
};

// Load posts from Umbraco Blog Page (blogsList)
const load = async function (): Promise<Array<Post>> {
  const res = await getBlogPage();
  const props = res?.properties as unknown as
    | {
        titleBlogList?: { markup?: string };
        descriptionBlogList?: { markup?: string };
        blogsList?: {
          items?: Array<{
            content?: {
              id?: string;
              properties?: {
                titleBlog?: { markup?: string } | null;
                subtitleBlog?: { markup?: string } | null;
                descriptionBlog?: { markup?: string } | null;
                imageBlog?: Array<{ url?: string }> | null;
                authorBlog?: { markup?: string } | null;
                themeBlog?: { markup?: string } | null;
                creationDate?: string | null;
              };
            } | null;
          } | null>;
        };
      }
    | undefined;

  const items = props?.blogsList?.items ?? [];

  const posts: Array<Post> = (
    await Promise.all(
      items.map(async (block) => {
        const content = block?.content;
        const id = (content?.id as string) || cryptoRandomId();
        const p = content?.properties as
          | {
              titleBlog?: { markup?: string } | null;
              subtitleBlog?: { markup?: string } | null;
              descriptionBlog?: { markup?: string } | null;
              imageBlog?: Array<{ url?: string }> | null;
              authorBlog?: { markup?: string } | null;
              themeBlog?: { markup?: string } | null;
              creationDate?: string | null;
            }
          | undefined;

        const title = decodeEntities(stripHtml(p?.titleBlog?.markup ?? ''));
        const excerpt = decodeEntities(stripHtml(p?.subtitleBlog?.markup ?? ''));
        const descriptionHtmlRaw = p?.descriptionBlog?.markup ?? '';
        const descriptionHtml = absolutizeUmbracoMediaUrls(descriptionHtmlRaw) ?? '';
        const imagePath = p?.imageBlog?.[0]?.url;
        const image = imagePath ? new URL(imagePath, import.meta.env.PUBLIC_UMBRACO_BASE_URL).toString() : undefined;
        const categoryTitle = decodeEntities(stripHtml(p?.themeBlog?.markup ?? '')) || undefined;
        const category = categoryTitle
          ? {
              slug: cleanSlug(categoryTitle),
              title: categoryTitle,
            }
          : undefined;
        const publishDate = new Date(p?.creationDate || new Date().toISOString());
        const slug = cleanSlug(title || id);
        const authorStr = decodeEntities(stripHtml(p?.authorBlog?.markup ?? ''));
        const author = authorStr ? authorStr : undefined;

        if (!title) return [] as Post[];

        return {
          id,
          slug,
          permalink: await generatePermalink({ id, slug, publishDate, category: category?.slug }),
          publishDate,
          updateDate: undefined,
          title,
          excerpt,
          image,
          category,
          tags: [],
          author,
          metadata: undefined,
          draft: false,
          content: descriptionHtml || undefined,
          Content: undefined,
          readingTime: undefined,
        } as Post;
      })
    )
  ).filter(Boolean) as Array<Post>;

  return posts.sort((a, b) => b.publishDate.valueOf() - a.publishDate.valueOf());
};

function cryptoRandomId(): string {
  // Access guarded; ignore type here because some environments may not declare crypto types
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (typeof crypto !== 'undefined' && crypto && typeof crypto.randomUUID === 'function') {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

let _posts: Array<Post>;

/** */
export const isBlogEnabled = APP_BLOG.isEnabled;
export const isRelatedPostsEnabled = APP_BLOG.isRelatedPostsEnabled;
export const isBlogListRouteEnabled = APP_BLOG.list.isEnabled;
export const isBlogPostRouteEnabled = APP_BLOG.post.isEnabled;
export const isBlogCategoryRouteEnabled = APP_BLOG.category.isEnabled;
export const isBlogTagRouteEnabled = APP_BLOG.tag.isEnabled;

export const blogListRobots = APP_BLOG.list.robots;
export async function getBlogListHeader(): Promise<{ title?: string; subtitle?: string }> {
  const res = await getBlogPage();
  const props = res?.properties as unknown as
    | {
        titleBlogList?: { markup?: string };
        descriptionBlogList?: { markup?: string };
      }
    | undefined;
  const title = decodeEntities(stripHtml(props?.titleBlogList?.markup ?? ''));
  const subtitle = decodeEntities(stripHtml(props?.descriptionBlogList?.markup ?? ''));
  return { title, subtitle };
}
export const blogPostRobots = APP_BLOG.post.robots;
export const blogCategoryRobots = APP_BLOG.category.robots;
export const blogTagRobots = APP_BLOG.tag.robots;

export const blogPostsPerPage = APP_BLOG?.postsPerPage;

/** */
export const fetchPosts = async (): Promise<Array<Post>> => {
  if (!_posts) {
    _posts = await load();
  }

  return _posts;
};

/** */
export const findPostsBySlugs = async (slugs: Array<string>): Promise<Array<Post>> => {
  if (!Array.isArray(slugs)) return [];

  const posts = await fetchPosts();

  return slugs.reduce(function (r: Array<Post>, slug: string) {
    posts.some(function (post: Post) {
      return slug === post.slug && r.push(post);
    });
    return r;
  }, []);
};

/** */
export const findPostsByIds = async (ids: Array<string>): Promise<Array<Post>> => {
  if (!Array.isArray(ids)) return [];

  const posts = await fetchPosts();

  return ids.reduce(function (r: Array<Post>, id: string) {
    posts.some(function (post: Post) {
      return id === post.id && r.push(post);
    });
    return r;
  }, []);
};

/** */
export const findLatestPosts = async ({ count }: { count?: number }): Promise<Array<Post>> => {
  const _count = count || 4;
  const posts = await fetchPosts();

  return posts ? posts.slice(0, _count) : [];
};

/** */
export const getStaticPathsBlogList = async ({ paginate }: { paginate: PaginateFunction }) => {
  if (!isBlogEnabled || !isBlogListRouteEnabled) return [];
  return paginate(await fetchPosts(), {
    params: { blog: BLOG_BASE || undefined },
    pageSize: blogPostsPerPage,
  });
};

/** */
export const getStaticPathsBlogPost = async () => {
  if (!isBlogEnabled || !isBlogPostRouteEnabled) return [];
  return (await fetchPosts()).flatMap((post) => ({
    params: {
      blog: post.permalink,
    },
    props: { post },
  }));
};

/** */
export const getStaticPathsBlogCategory = async ({ paginate }: { paginate: PaginateFunction }) => {
  if (!isBlogEnabled || !isBlogCategoryRouteEnabled) return [];

  const posts = await fetchPosts();
  const categories = {};
  posts.map((post) => {
    if (post.category?.slug) {
      categories[post.category?.slug] = post.category;
    }
  });

  return Array.from(Object.keys(categories)).flatMap((categorySlug) =>
    paginate(
      posts.filter((post) => post.category?.slug && categorySlug === post.category?.slug),
      {
        params: { category: categorySlug, blog: CATEGORY_BASE || undefined },
        pageSize: blogPostsPerPage,
        props: { category: categories[categorySlug] },
      }
    )
  );
};

/** */
export const getStaticPathsBlogTag = async ({ paginate }: { paginate: PaginateFunction }) => {
  if (!isBlogEnabled || !isBlogTagRouteEnabled) return [];

  const posts = await fetchPosts();
  const tags = {};
  posts.map((post) => {
    if (Array.isArray(post.tags)) {
      post.tags.map((tag) => {
        tags[tag?.slug] = tag;
      });
    }
  });

  return Array.from(Object.keys(tags)).flatMap((tagSlug) =>
    paginate(
      posts.filter((post) => Array.isArray(post.tags) && post.tags.find((elem) => elem.slug === tagSlug)),
      {
        params: { tag: tagSlug, blog: TAG_BASE || undefined },
        pageSize: blogPostsPerPage,
        props: { tag: tags[tagSlug] },
      }
    )
  );
};

/** */
export async function getRelatedPosts(originalPost: Post, maxResults: number = 4): Promise<Post[]> {
  const allPosts = await fetchPosts();
  const originalTagsSet = new Set(originalPost.tags ? originalPost.tags.map((tag) => tag.slug) : []);

  const postsWithScores = allPosts.reduce((acc: { post: Post; score: number }[], iteratedPost: Post) => {
    if (iteratedPost.slug === originalPost.slug) return acc;

    let score = 0;
    if (iteratedPost.category && originalPost.category && iteratedPost.category.slug === originalPost.category.slug) {
      score += 5;
    }

    if (iteratedPost.tags) {
      iteratedPost.tags.forEach((tag) => {
        if (originalTagsSet.has(tag.slug)) {
          score += 1;
        }
      });
    }

    acc.push({ post: iteratedPost, score });
    return acc;
  }, []);

  postsWithScores.sort((a, b) => b.score - a.score);

  const selectedPosts: Post[] = [];
  let i = 0;
  while (selectedPosts.length < maxResults && i < postsWithScores.length) {
    selectedPosts.push(postsWithScores[i].post);
    i++;
  }

  return selectedPosts;
}
