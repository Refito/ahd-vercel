export interface UmbracoItem<TProperties = Record<string, unknown>> {
  id: string;
  name: string;
  contentType: string;
  createDate: string; // ISO string
  updateDate: string; // ISO string
  route?: {
    path: string; // e.g. "/home"
  };
  properties: TProperties;
}

export interface UmbracoList<TItem = UmbracoItem> {
  total: number;
  items: TItem[];
}
