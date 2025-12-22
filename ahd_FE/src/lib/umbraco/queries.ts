import { umbraco } from './client';
import type { UmbracoItem, UmbracoList } from './types';

/**
 * Example query helpers. Adjust doctypes and paths to your project.
 */

export async function getSettingsPage(): Promise<UmbracoItem | null> {
  try {
    const res = await umbraco.getItemByPath<UmbracoItem>('/');

    return res;
  } catch {
    console.log('Error fetching settings page');
    return null;
  }
}

export async function getHomePage(): Promise<UmbracoItem | null> {
  try {
    return await umbraco.getItemByPath<UmbracoItem>('/home-page');
  } catch {
    return null;
  }
}

export async function getAboutPage(): Promise<UmbracoItem | null> {
  try {
    return await umbraco.getItemByPath<UmbracoItem>('/about-page');
  } catch {
    return null;
  }
}

export async function getServicesPage(): Promise<UmbracoItem | null> {
  try {
    return await umbraco.getItemByPath<UmbracoItem>('/service-page');
  } catch {
    return null;
  }
}

export async function getBlogPage(): Promise<UmbracoItem | null> {
  try {
    return await umbraco.getItemByPath<UmbracoItem>('/blog-page');
  } catch {
    return null;
  }
}

export async function getBlogPosts(take = 10, skip = 0): Promise<UmbracoItem[]> {
  const res = await umbraco.searchByContentType<UmbracoList>('blogPost', take, skip);
  return res?.items ?? [];
}
