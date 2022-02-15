import {
  etaCompile,
  etaConfigure,
  etaRenderFile,
  etaTemplates,
  path,
} from "./deps.ts";
import { Page } from "./page.ts";
import { SiteConfig } from "./config.ts";
import { hasKey } from "./attr.ts";

etaConfigure({
  autotrim: true,
});

interface Breadcrumb {
  slug: string;
  url: string;
  current: boolean;
  isTag?: boolean;
}

interface IndexItem {
  url: string;
  title: string;
  description?: string;
  isIndexPage: boolean;
  pinned: boolean;
  date: Date | null;
  readableDate: string | null;
}

const toReadableDate = (date: Date) =>
  new Date(date).toLocaleDateString("en-us", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

function generateIndexItems(pages: Array<Page>): Array<IndexItem> {
  const items: Array<IndexItem> = [];

  for (const p of pages) {
    const isPinned = hasKey(p.attributes, ["pinned"]);
    const readableDate = p.date ? toReadableDate(p.date) : null;
    items.push({
      url: path.join("/", path.dirname(p.path), p.slug),
      title: p.title,
      description: p.description,
      date: p.date ? p.date : null,
      readableDate,
      isIndexPage: p.isIndex,
      pinned: isPinned,
    });
  }

  items
    .sort((a, b) => {
      if (a.date && b.date) {
        return b.date.valueOf() - a.date.valueOf();
      } else {
        return 0;
      }
    })
    .sort((a) => a.isIndexPage ? -1 : 0)
    .sort((a) => a.pinned ? -1 : 0);

  return items;
}

function generateBreadcrumbs(
  currentPage: Page,
  homeSlug?: string,
): Array<Breadcrumb> {
  const dir: string = path.dirname(currentPage.path);
  const chunks = dir.split("/").filter((path) => path !== ".");
  const { slug } = currentPage;

  let breadcrumbs: Array<Breadcrumb> = chunks.map((chunk, index) => {
    const slug = chunk;
    const url = path.join("/", ...chunks.slice(0, index + 1));
    return {
      slug,
      url,
      current: false,
    };
  });

  if (homeSlug && homeSlug !== "") {
    breadcrumbs = [
      { slug: homeSlug, url: "/", current: false },
      ...breadcrumbs,
    ];
  } else {
    breadcrumbs = [
      { slug: "index", url: "/", current: false },
      ...breadcrumbs,
    ];
  }

  if (slug !== "") {
    breadcrumbs = [
      ...breadcrumbs,
      { slug, url: "", current: true },
    ];
  }

  return breadcrumbs;
}

export async function buildPage(
  page: Page,
  headInclude: string,
  childPages: Array<Page>,
  backLinkedPages: Array<Page>,
  taggedPages: { [tag: string]: Array<Page> },
  childTags: Array<string>,
  viewPath: string,
  siteConf: SiteConfig,
): Promise<string | void> {
  const { title, description, tags, date, html: content } = page;
  const readableDate = date ? toReadableDate(date) : null;
  const breadcrumbs = generateBreadcrumbs(page, siteConf.rootName);
  const backlinkIndexItems = generateIndexItems(backLinkedPages);
  const childIndexItems = generateIndexItems(childPages);

  const tagLists: { [tag: string]: Array<IndexItem> } = {};
  for (const tag of Object.keys(taggedPages)) {
    const tagIndex = generateIndexItems(
      taggedPages[tag].filter((taggedPage) => taggedPage !== page),
    );
    if (tagIndex.length !== 0) {
      tagLists[tag] = tagIndex;
    }
  }

  etaTemplates.define("head", etaCompile(headInclude));

  return await etaRenderFile(viewPath, {
    page: {
      title,
      description,
      content,
      date: date,
      tags,
      readableDate: readableDate,
    },
    breadcrumbs,
    indexLinks: childIndexItems,
    backLinks: backlinkIndexItems,
    taggedIndexLinks: tagLists,
    childTags,
    site: siteConf,
  });
}

export async function buildTagPage(
  name: string,
  pages: Array<Page>,
  tagViewPath: string,
  headInclude: string,
  siteConf: SiteConfig,
): Promise<string | void> {
  etaTemplates.define("head", etaCompile(headInclude));
  const indexItems = generateIndexItems(pages);
  const breadcrumbs: Array<Breadcrumb> = [
    { slug: "index", url: "/", current: false },
    { slug: `#${name}`, url: "", current: true, isTag: true },
  ];

  const result = await etaRenderFile(tagViewPath, {
    page: {
      title: `#${name}`,
      description: `Pages tagged #${name}`,
    },
    name,
    breadcrumbs,
    indexLinks: indexItems,
    site: siteConf,
  });
  return result;
}

export async function buildFeed(
  pages: Array<Page>,
  viewPath: string,
  siteConf: SiteConfig,
): Promise<string | void> {
  const result = await etaRenderFile(viewPath, {
    pages,
    site: siteConf,
  });
  return result;
}
