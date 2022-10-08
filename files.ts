import { copy, ensureDir, WalkEntry } from "./deps.ts";
import { basename, dirname, join, relative } from "./deps.ts";
import { renderPage } from "./render.tsx";
import { getTags } from "./attributes.ts";
import {
  getBacklinkPages,
  getChildPages,
  getChildTags,
  getPagesByTag,
} from "./pages.ts";

import type { OutputFile, Page, UserConfig } from "./types.d.ts";

export function buildContentFiles(
  pages: Page[],
  opts: {
    outputPath: string;
    userConfig: UserConfig;
    dev: boolean;
  },
): OutputFile[] {
  const files: Array<OutputFile> = [];

  for (const page of pages) {
    const filePath = join(
      opts.outputPath,
      page.url.pathname,
      "index.html",
    );

    const tags = page.attrs && getTags(page.attrs);
    const pagesByTag: { [tag: string]: Page[] } = {};
    tags && tags.forEach((tag: string) => {
      pagesByTag[tag] = getPagesByTag(pages, tag);
    });

    const html = renderPage({
      page: page,
      dev: opts.dev,
      childPages: getChildPages(pages, page),
      backlinkPages: getBacklinkPages(pages, page),
      taggedPages: pagesByTag,
      childTags: getChildTags(pages, page),
      userConfig: opts.userConfig,
    });

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
  opts: BuildOpts,
): Promise<OutputFile[]> {
  const files: Array<OutputFile> = [];

  for (const tag of tagPages) {
    const filePath = join(
      opts.outputPath,
      "tag",
      tag.name,
      "index.html",
    );

    const html = await buildTagPage(tag.name, {
      headTemplate: opts.headTemplate,
      footerTemplate: opts.footerTemplate,
      taggedPages: tag.pages,
      view: opts.view,
      includeRefresh: opts.includeRefresh,
      userConfig: opts.userConfig,
      style: opts.style,
    });

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
  pages: Page[],
  view: string,
  outputPath: string,
  userConfig: UserConfig,
): Promise<OutputFile | undefined> {
  const xml = await buildFeed(
    pages,
    view,
    userConfig,
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
  entries: Array<WalkEntry>,
  inputPath: string,
  outputPath: string,
): OutputFile[] {
  const files: Array<OutputFile> = [];

  for (const entry of entries) {
    const relPath = relative(inputPath, entry.path);
    const filePath = join(
      outputPath,
      dirname(relPath),
      basename(relPath),
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
  quiet = false,
) {
  for (const file of files) {
    if (file.fileContent) {
      quiet ||
        console.log(`write\t${relative(Deno.cwd(), file.filePath)}`);
      await ensureDir(dirname(file.filePath));
      await Deno.writeTextFile(file.filePath, file.fileContent);
    }
  }
}

export async function copyFiles(
  files: OutputFile[],
  quiet = false,
) {
  for (const file of files) {
    if (file.inputPath) {
      quiet ||
        console.log(`copy\t${relative(Deno.cwd(), file.filePath)}`);
      await ensureDir(dirname(file.filePath));
      await copy(file.inputPath, file.filePath);
    }
  }
}
