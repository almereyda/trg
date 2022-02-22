import { fs, path } from "./deps.ts";
import { buildFeed, buildPage, buildTagPage } from "./build.ts";
import { SiteConfig } from "./config.ts";
import {
  getBacklinkPages,
  getChildPages,
  getChildTags,
  getPagesByTag,
  Page,
  TagPage,
} from "./pages.ts";
import { getTags } from "./data.ts";

export interface OutputFile {
  inputPath?: string;
  filePath: string;
  fileContent?: string;
}

export async function buildContentFiles(
  pages: Array<Page>,
  outputPath: string,
  pageViewPath: string,
  headInclude: string,
  siteConf: SiteConfig,
): Promise<OutputFile[]> {
  const files: Array<OutputFile> = [];

  for (const page of pages) {
    const filePath = path.join(
      outputPath,
      page.url.pathname,
      "index.html",
    );

    const tags = getTags(page.data);
    const pagesByTag: { [tag: string]: Array<Page> } = {};
    tags.forEach((tag: string) => {
      pagesByTag[tag] = getPagesByTag(pages, tag);
    });

    const html = await buildPage(
      page,
      headInclude,
      page.isIndex ? getChildPages(pages, page) : [],
      getBacklinkPages(pages, page),
      pagesByTag,
      page.isIndex ? getChildTags(pages, page) : [],
      pageViewPath,
      siteConf,
    );

    if (typeof html === "string") {
      files.push({
        filePath,
        fileContent: html,
      });
    }
  }

  return files;
}

export async function buildTagFiles(
  tagPages: Array<TagPage>,
  outputPath: string,
  tagViewPath: string,
  headInclude: string,
  siteConf: SiteConfig,
): Promise<OutputFile[]> {
  const files: Array<OutputFile> = [];

  for (const tag of tagPages) {
    const filePath = path.join(
      outputPath,
      "tag",
      tag.name,
      "index.html",
    );

    const html = await buildTagPage(
      tag.name,
      tag.pages,
      tagViewPath,
      headInclude,
      siteConf,
    );

    if (typeof html === "string") {
      files.push({
        inputPath: "",
        filePath,
        fileContent: html,
      });
    }
  }

  return files;
}

export async function buildFeedFile(
  pages: Array<Page>,
  feedViewPath: string,
  outputPath: string,
  siteConf: SiteConfig,
): Promise<OutputFile | undefined> {
  const xml = await buildFeed(
    pages,
    feedViewPath,
    siteConf,
  );

  if (typeof xml === "string") {
    return {
      inputPath: "",
      filePath: outputPath,
      fileContent: xml,
    };
  }
}

export function getStaticFiles(
  entries: Array<fs.WalkEntry>,
  inputPath: string,
  outputPath: string,
): OutputFile[] {
  const files: Array<OutputFile> = [];

  for (const entry of entries) {
    const relPath = path.relative(inputPath, entry.path);
    const filePath = path.join(
      outputPath,
      path.dirname(relPath),
      path.basename(relPath),
    );
    files.push({
      inputPath: entry.path,
      filePath,
    });
  }

  return files;
}

export async function writeFiles(
  files: OutputFile[],
  description: string,
) {
  files.length > 0 &&
    console.log(`%c\nWriting ${description}:`, "font-weight: bold");

  for (const file of files) {
    if (file.fileContent) {
      console.log(`  ${path.relative(Deno.cwd(), file.filePath)}`);
      await fs.ensureDir(path.dirname(file.filePath));
      await Deno.writeTextFile(file.filePath, file.fileContent);
    }
  }
}

export async function copyFiles(
  files: OutputFile[],
  description: string,
) {
  files.length > 0 &&
    console.log(`%c\nCopying ${description}:`, "font-weight: bold");

  for (const file of files) {
    if (file.inputPath) {
      console.log(`  ${path.relative(Deno.cwd(), file.filePath)}`);
      await fs.ensureDir(path.dirname(file.filePath));
      await fs.copy(file.inputPath, file.filePath);
    }
  }
}
