import vm from "node:vm";
import type { BuilderFileMap } from "./builder-files.ts";
import { inferAppKind, type BuilderPlan } from "./builder-architecture.ts";
import {
  buildPreviewDocument,
  hasBrokenLocalAssets,
  isSubstantialApp,
  jsSyntaxOk,
  looksLikeRawMarkup,
  previewDocumentReady,
  previewIsInteractive,
} from "./builder-quality.ts";

export type GateTest = { name: string; pass: boolean };

const CRITICAL = new Set([
  "Build",
  "Önizleme render",
  "CSS yüklü",
  "Ham HTML değil",
  "JS sözdizimi",
  "Runtime",
  "Konsol hatası yok",
  "Eksik bağımlılık yok",
  "Kırık route yok",
  "Butonlar",
  "Formlar",
  "Asset",
  "Responsive taşma",
  "Mobil menü",
  "Gizli anahtar yok",
  "Etkileşimli önizleme",
  "API hataları",
]);

export function isCriticalGate(name: string) {
  return CRITICAL.has(name);
}

function blobOf(files: BuilderFileMap) {
  return Object.entries(files)
    .map(([n, b]) => `${n}\n${b}`)
    .join("\n");
}

export function runJsRuntime(html: string, js: string) {
  const errors: string[] = [];
  const text = String(js || "").trim();
  if (!text) return { ok: true, errors };
  if (!jsSyntaxOk(text)) return { ok: false, errors: ["JavaScript sözdizimi bozuk."] };
  const ids = new Set(
    [...String(html || "").matchAll(/\bid=["']([^"']+)["']/gi)].map((m) => m[1]),
  );
  const el = (name: string) => {
    const node: Record<string, unknown> = {
      id: name,
      style: {},
      className: "",
      hidden: false,
      innerHTML: "",
      textContent: "",
      value: "",
      checked: false,
      dataset: {},
      classList: {
        add() {},
        remove() {},
        toggle() {},
        contains() {
          return false;
        },
      },
      getAttribute(key: string) {
        return key === "data-page" || key === "data-go" ? name : null;
      },
      setAttribute() {},
      appendChild() {},
      remove() {},
      closest() {
        return null;
      },
      querySelector() {
        return el("child");
      },
      querySelectorAll() {
        return [];
      },
      addEventListener() {},
      removeEventListener() {},
      reset() {},
    };
    return node;
  };
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  const document = {
    body: el("body"),
    documentElement: { ...el("html"), setAttribute() {}, getAttribute() { return null; } },
    getElementById(id: string) {
      return ids.has(id) ? el(id) : null;
    },
    querySelector() {
      return el("q");
    },
    querySelectorAll() {
      return [];
    },
    addEventListener(type: string, fn: (...args: unknown[]) => void) {
      (listeners[type] ||= []).push(fn);
    },
    removeEventListener() {},
    createElement(tag: string) {
      return el(tag);
    },
    createTextNode(value: string) {
      return { textContent: value };
    },
  };
  const location = { hash: "", href: "https://preview.local/" };
  const sandbox: Record<string, unknown> = {
    console: {
      log() {},
      info() {},
      debug() {},
      warn(...args: unknown[]) {
        errors.push(args.map(String).join(" "));
      },
      error(...args: unknown[]) {
        errors.push(args.map(String).join(" "));
      },
    },
    document,
    location,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {}, clear() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {}, clear() {} },
    addEventListener(type: string, fn: (...args: unknown[]) => void) {
      (listeners[type] ||= []).push(fn);
    },
    alert() {},
    setTimeout() { return 0; },
    clearTimeout() {},
    setInterval() { return 0; },
    clearInterval() {},
    requestAnimationFrame() { return 0; },
    Array,
    Object,
    String,
    Number,
    Boolean,
    Math,
    JSON,
    Date,
    Error,
    Map,
    Set,
    Promise,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    undefined,
    NaN,
    Infinity,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  try {
    vm.runInNewContext(`"use strict";\n
... 