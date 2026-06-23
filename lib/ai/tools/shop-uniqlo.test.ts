import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildUniqloSearchUrl,
  chooseUniqloProducts,
  rankUniqloProduct,
} from "./shop-uniqlo";

describe("shopUniqlo helpers", () => {
  it("builds a UNIQLO Japan search URL", () => {
    const url = buildUniqloSearchUrl({
      query: "白 Tシャツ",
      region: "jp",
    });

    const parsedUrl = new URL(url);

    assert.equal(parsedUrl.origin, "https://www.uniqlo.com");
    assert.equal(parsedUrl.pathname, "/jp/ja/search");
    assert.equal(parsedUrl.searchParams.get("q"), "白 Tシャツ");
  });

  it("scores white T-shirt candidates above unrelated links", () => {
    const whiteTshirt = rankUniqloProduct({
      product: {
        href: "https://www.uniqlo.com/jp/ja/products/E123456-000/00",
        text: "クルーネックTシャツ ホワイト ¥1,500",
      },
      query: "白 Tシャツ",
    });
    const unrelated = rankUniqloProduct({
      product: {
        href: "https://www.uniqlo.com/jp/ja/products/E654321-000/00",
        text: "スウェットパンツ ブラック ¥2,990",
      },
      query: "白 Tシャツ",
    });

    assert.equal(whiteTshirt.price, "¥1,500");
    assert.ok(whiteTshirt.score > unrelated.score);
  });

  it("deduplicates and limits candidates", () => {
    const products = chooseUniqloProducts({
      links: [
        {
          href: "https://www.uniqlo.com/jp/ja/products/E111111-000/00",
          text: "エアリズムコットンTシャツ ホワイト ¥1,990",
        },
        {
          href: "https://www.uniqlo.com/jp/ja/products/E111111-000/00",
          text: "エアリズムコットンTシャツ ホワイト ¥1,990",
        },
        {
          href: "https://www.uniqlo.com/jp/ja/products/E222222-000/00",
          text: "ドライカラークルーネックTシャツ 白 ¥790",
        },
      ],
      query: "白 Tシャツ",
      maxResults: 1,
    });

    assert.equal(products.length, 1);
    assert.match(products[0].name, /Tシャツ/);
  });
});
