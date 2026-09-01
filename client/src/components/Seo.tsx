import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const siteUrl = import.meta.env.VITE_APP_URL || "https://sshhkoihai.com";
const siteName = "Sshh... Koi Hai?";

const pageSeo: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Sshh... Koi Hai? | Private Conversations & Meaningful Connections",
    description: "A discreet, privacy-first dating space for verified adults to discover meaningful connections and start private conversations.",
  },
  "/about": {
    title: "About Us | Privacy-First Dating for Adults",
    description: "Learn how Sshh... Koi Hai? creates a quieter, privacy-first way for adults to meet and connect with intention.",
  },
  "/how-it-works": {
    title: "How It Works | Meet at Your Own Pace",
    description: "Create a thoughtful profile, discover compatible adults, and start a private conversation when interest is mutual.",
  },
  "/membership": {
    title: "Membership Plans | Sshh... Koi Hai?",
    description: "Explore clear membership options for a private and meaningful adult dating experience.",
  },
  "/safety": {
    title: "Safety Guidelines | Sshh... Koi Hai?",
    description: "Practical safety guidance, privacy controls, blocking, reporting, and boundaries for online dating conversations.",
  },
  "/privacy": {
    title: "Privacy Policy | Sshh... Koi Hai?",
    description: "Read the privacy framework for account information, profiles, messages, payments, cookies, and deletion requests.",
  },
  "/terms": {
    title: "Terms of Service | Sshh... Koi Hai?",
    description: "Review the terms and community expectations for using Sshh... Koi Hai?.",
  },
  "/community-guidelines": {
    title: "Community Guidelines | Sshh... Koi Hai?",
    description: "Our standards for respectful, honest, consensual, and safe conversations between members.",
  },
  "/refunds": {
    title: "Refund and Cancellation Policy | Sshh... Koi Hai?",
    description: "Review subscription cancellation, renewal, payment, and refund information.",
  },
  "/cookies": {
    title: "Cookie Policy | Sshh... Koi Hai?",
    description: "Learn how essential and optional cookies may support the Sshh... Koi Hai? experience.",
  },
  "/contact": {
    title: "Contact Us | Sshh... Koi Hai?",
    description: "Contact the Sshh... Koi Hai? team for launch updates, support, and general questions.",
  },
};

const publicPaths = new Set(Object.keys(pageSeo));

function setMeta(name: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}

function setProperty(property: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }
  element.content = content;
}

export default function Seo() {
  const { pathname } = useLocation();
  const seo = pageSeo[pathname] ?? {
    title: `${siteName} | Private Conversations for Adults`,
    description: "A private space for adults to discover meaningful connections and conversations.",
  };
  const isPublic = publicPaths.has(pathname);
  const canonicalUrl = `${siteUrl}${pathname === "/" ? "/" : pathname}`;

  useEffect(() => {
    document.title = seo.title;
    setMeta("description", seo.description);
    setMeta("robots", isPublic ? "index,follow,max-image-preview:large" : "noindex,nofollow");
    setProperty("og:type", "website");
    setProperty("og:site_name", siteName);
    setProperty("og:title", seo.title);
    setProperty("og:description", seo.description);
    setProperty("og:url", canonicalUrl);
    setProperty("og:image", `${siteUrl}/og-image.png`);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", seo.title);
    setMeta("twitter:description", seo.description);
    setMeta("twitter:image", `${siteUrl}/og-image.png`);

    let canonical = document.head.querySelector<HTMLLinkElement>("link[rel=canonical]");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    let structuredData = document.getElementById("site-structured-data");
    if (!structuredData) {
      structuredData = document.createElement("script");
      structuredData.id = "site-structured-data";
      structuredData.type = "application/ld+json";
      document.head.appendChild(structuredData);
    }
    structuredData.textContent = JSON.stringify([
      { "@context": "https://schema.org", "@type": "Organization", name: siteName, url: siteUrl, logo: `${siteUrl}/logo-transparent.png` },
      { "@context": "https://schema.org", "@type": "WebSite", name: siteName, url: siteUrl, description: seo.description },
    ]);
  }, [canonicalUrl, isPublic, seo.description, seo.title]);

  return null;
}
