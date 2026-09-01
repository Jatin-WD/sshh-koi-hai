import fs from "node:fs";
import path from "node:path";
import { publicAppUrl } from "../config/env.js";

const siteName = "Sshh... Koi Hai?";
const siteUrl = publicAppUrl.replace(/\/$/, "");
const socialImage = `${siteUrl}/og-image.png`;
const pages: Record<string, { title: string; description: string }> = {
  "/": { title: "Sshh... Koi Hai? | Private Conversations & Meaningful Connections", description: "Discover a private 18+ space designed for meaningful conversations, genuine connections and discreet member interactions." },
  "/about": { title: "About | Sshh... Koi Hai?", description: "Learn how Sshh... Koi Hai? creates a quieter, privacy-first way for adults to meet and connect with intention." },
  "/how-it-works": { title: "How It Works | Sshh... Koi Hai?", description: "Create a thoughtful profile, discover compatible adults, and start a private conversation when interest is mutual." },
  "/membership": { title: "Membership | Sshh... Koi Hai?", description: "Explore clear membership options for a private and meaningful adult conversation experience." },
  "/safety": { title: "Safety Guidelines | Sshh... Koi Hai?", description: "Practical safety guidance, privacy controls, blocking, reporting, and boundaries for online conversations." },
  "/privacy": { title: "Privacy Policy | Sshh... Koi Hai?", description: "Read how Sshh... Koi Hai? handles account information, profiles, messages, payments, cookies, and deletion requests." },
  "/terms": { title: "Terms of Service | Sshh... Koi Hai?", description: "Review the terms and community expectations for using Sshh... Koi Hai?." },
  "/community-guidelines": { title: "Community Guidelines | Sshh... Koi Hai?", description: "Our standards for respectful, honest, consensual, and safe conversations between members." },
  "/refunds": { title: "Refund and Cancellation Policy | Sshh... Koi Hai?", description: "Review subscription cancellation, renewal, payment, and refund information." },
  "/cookies": { title: "Cookie Policy | Sshh... Koi Hai?", description: "Learn how essential and optional cookies may support the Sshh... Koi Hai? experience." },
  "/contact": { title: "Contact | Sshh... Koi Hai?", description: "Contact the Sshh... Koi Hai? team for support and general questions." },
};
const privatePrefixes = ["/admin", "/account", "/settings", "/discover", "/likes", "/matches", "/messages", "/notifications", "/profile", "/checkout", "/payment", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];
const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
const isPrivate = (pathname: string) => privatePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export function renderSeoHtml(template: string, pathname: string) {
  const page = pages[pathname];
  const indexable = Boolean(page) && !isPrivate(pathname);
  const title = page?.title ?? `${siteName} | Private Conversations for Adults`;
  const description = page?.description ?? "A private space for adults to discover meaningful connections and conversations.";
  const canonical = `${siteUrl}${pathname === "/" ? "/" : pathname}`;
  const robots = indexable ? "index,follow,max-image-preview:large" : "noindex,nofollow";
  const jsonLd = JSON.stringify([{ "@context": "https://schema.org", "@type": "Organization", name: siteName, url: siteUrl, logo: `${siteUrl}/logo-transparent.png` }, { "@context": "https://schema.org", "@type": "WebSite", name: siteName, url: siteUrl, description }]).replace(/</g, "\\u003c");
  const head = `<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="${robots}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:type" content="website"><meta property="og:site_name" content="${siteName}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${escapeHtml(socialImage)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(socialImage)}"><script id="site-structured-data" type="application/ld+json">${jsonLd}</script>`;
  return template.replace(/<title>[\s\S]*?<\/title>/i, "").replace(/<meta name="description"[^>]*>/i, "").replace(/<meta name="robots"[^>]*>/i, "").replace(/<link rel="canonical"[^>]*>/i, "").replace(/<meta property="og:[^>]*>/gi, "").replace(/<meta name="twitter:[^>]*>/gi, "").replace("</head>", `${head}</head>`);
}

export function loadClientTemplate(clientDist: string) {
  return fs.readFileSync(path.join(clientDist, "index.html"), "utf8");
}
