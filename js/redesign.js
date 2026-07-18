(function () {
  "use strict";

  var TOKEN = "4nV5gNwwP68zUDat26ySChREqVaQaLudfJBkSgEzpump";
  var OUTPUT_SIZE = 960;

  function formatUsd(value) {
    if (value == null || Number.isNaN(value)) return "—";
    if (value >= 1e9) return "$" + (value / 1e9).toFixed(2) + "B";
    if (value >= 1e6) return "$" + (value / 1e6).toFixed(2) + "M";
    if (value >= 1e3) return "$" + (value / 1e3).toFixed(1) + "K";
    return "$" + Math.round(value).toLocaleString();
  }

  function formatPrice(value) {
    if (value == null || Number.isNaN(value)) return "—";
    return value >= 1 ? "$" + value.toFixed(2) : "$" + value.toFixed(8);
  }

  function formatPercent(value) {
    if (value == null || Number.isNaN(value)) return "—";
    return (value >= 0 ? "+" : "") + value.toFixed(2) + "%";
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach(function (element) {
      element.textContent = value;
    });
  }

  async function loadMarket() {
    try {
      var response = await fetch("https://api.dexscreener.com/latest/dex/tokens/" + TOKEN);
      if (!response.ok) return;
      var data = await response.json();
      var pairs = (data.pairs || [])
        .filter(function (pair) { return pair.chainId === "solana"; })
        .sort(function (a, b) {
          return ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0);
        });
      if (!pairs.length) return;
      var pair = pairs[0];
      var marketCap = pair.marketCap != null ? pair.marketCap : pair.fdv;
      var change = pair.priceChange && pair.priceChange.h24;
      var price = Number(pair.priceUsd) || null;
      setText("[data-market-cap]", formatUsd(marketCap));
      setText("[data-market-change]", formatPercent(change));
      setText("[data-market-price]", formatPrice(price));
      document.querySelectorAll("[data-market-change], [data-market-change-wrap]").forEach(function (element) {
        element.classList.remove("is-up", "is-down");
        if (change != null && !Number.isNaN(Number(change))) {
          element.classList.add(Number(change) >= 0 ? "is-up" : "is-down");
        }
      });
    } catch (error) {
      // Neutral placeholders remain visible when the market feed is unavailable.
    }
  }

  function initReveal() {
    var elements = document.querySelectorAll("[data-reveal]");
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      elements.forEach(function (element) { element.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8%" });
    elements.forEach(function (element) { observer.observe(element); });
  }

  function initHeroArt() {
    var art = document.getElementById("heroArt");
    if (!art) return;
    art.addEventListener("pointermove", function (event) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      var rect = art.getBoundingClientRect();
      var x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      var y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      art.style.setProperty("--pointer-x", x * 5 + "px");
      art.style.setProperty("--pointer-y", y * 5 + "px");
    });
    art.addEventListener("pointerleave", function () {
      art.style.setProperty("--pointer-x", "0px");
      art.style.setProperty("--pointer-y", "0px");
    });
  }

  function initCopyContract() {
    var button = document.getElementById("copyContract");
    if (!button) return;
    button.addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText(TOKEN);
      } catch (error) {
        var textarea = document.createElement("textarea");
        textarea.value = TOKEN;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      button.textContent = "Copied ✓";
      window.setTimeout(function () { button.textContent = "Copy address"; }, 1800);
    });
  }

  function decode(encoded) {
    var pixels = [];
    encoded = encoded || "";
    for (var index = 0; index < encoded.length; index += 10) {
      pixels.push([
        Number.parseInt(encoded.slice(index, index + 2), 16),
        Number.parseInt(encoded.slice(index + 2, index + 4), 16),
        "#" + encoded.slice(index + 4, index + 10)
      ]);
    }
    return pixels;
  }

  function paint(context, pixels) {
    pixels.forEach(function (pixel) {
      context.fillStyle = pixel[2];
      context.fillRect(pixel[1], pixel[0], 1, 1);
    });
  }

  function paintBackground(context, background) {
    if (background.pixels && background.pixels.length) {
      paint(context, background.pixels);
      return;
    }
    context.fillStyle = "#" + (background.hex || "efdfd8");
    context.fillRect(0, 0, 24, 24);
  }

  function wrapText(context, text, maxWidth) {
    var words = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
    var lines = [];
    var line = "";
    words.forEach(function (word) {
      var candidate = line ? line + " " + word : word;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }

  function drawMemeText(context, text, position) {
    if (!text.trim()) return;
    var fontSize = 82;
    context.font = "900 " + fontSize + "px Impact, 'Arial Black', sans-serif";
    context.textAlign = "center";
    context.lineJoin = "round";
    context.lineWidth = 10;
    context.strokeStyle = "#000";
    context.fillStyle = "#fff";
    var lines = wrapText(context, text, OUTPUT_SIZE - 68);
    var lineHeight = fontSize * 1.03;
    lines.forEach(function (line, index) {
      var y = position === "top"
        ? 96 + index * lineHeight
        : OUTPUT_SIZE - 46 - (lines.length - 1 - index) * lineHeight;
      context.strokeText(line, OUTPUT_SIZE / 2, y);
      context.fillText(line, OUTPUT_SIZE / 2, y);
    });
  }

  function backgroundStyle(background) {
    if (background.g) {
      return "linear-gradient(135deg, " + background.g.tl + ", " + background.g.br + ")";
    }
    return "#" + (background.hex || "efdfd8");
  }

  async function initGenerator() {
    var canvas = document.getElementById("pixelBoboCanvas");
    if (!canvas) return;
    var loading = document.getElementById("generatorLoading");
    var summary = document.getElementById("traitSummary");
    var swatches = document.getElementById("backgroundSwatches");
    var selectGrid = document.getElementById("traitSelectGrid");
    var topText = document.getElementById("topText");
    var bottomText = document.getElementById("bottomText");
    var watermark = document.getElementById("watermark");
    var shuffle = document.getElementById("shuffleTraits");
    var clear = document.getElementById("clearTraits");
    var save = document.getElementById("saveBobo");
    var prepared;
    var backgroundIndex = 0;
    var picks = { Body: 3, Mouth: 4, Eyes: 0, "Head Item": null, Item: null };

    function render() {
      if (!prepared) return;
      var context = canvas.getContext("2d");
      var pixelCanvas = document.createElement("canvas");
      pixelCanvas.width = 24;
      pixelCanvas.height = 24;
      var pixelContext = pixelCanvas.getContext("2d");
      if (!context || !pixelContext) return;
      pixelContext.imageSmoothingEnabled = false;
      paintBackground(pixelContext, prepared.backgrounds[backgroundIndex]);
      paint(pixelContext, prepared.base);
      prepared.raw.zorder.forEach(function (slot) {
        var selected = picks[slot];
        if (selected == null) return;
        var layer = prepared.slots[slot] && prepared.slots[slot][selected];
        if (layer) paint(pixelContext, layer.pixels);
      });
      context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      context.imageSmoothingEnabled = false;
      context.drawImage(pixelCanvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      drawMemeText(context, topText.value, "top");
      drawMemeText(context, bottomText.value, "bottom");
      if (watermark.checked) {
        context.font = "700 34px 'IBM Plex Mono', monospace";
        context.textAlign = "right";
        context.lineWidth = 8;
        context.strokeStyle = "rgba(0,0,0,.88)";
        context.fillStyle = "#f3e3c3";
        context.strokeText("$BOBO", OUTPUT_SIZE - 22, OUTPUT_SIZE - 22);
        context.fillText("$BOBO", OUTPUT_SIZE - 22, OUTPUT_SIZE - 22);
      }
      var names = prepared.raw.zorder.map(function (slot) {
        var selected = picks[slot];
        return selected == null ? null : prepared.slots[slot][selected].name;
      }).filter(Boolean);
      summary.textContent = names.join(" · ") || "Bare Bobo";
    }

    try {
      var response = await fetch("pixel-bobo-data.json");
      if (!response.ok) throw new Error("Generator data unavailable");
      var data = await response.json();
      prepared = {
        raw: data,
        base: decode(data.bobo.p),
        backgrounds: data.bgs.map(function (background) {
          return Object.assign({}, background, { pixels: background.p ? decode(background.p) : undefined });
        }),
        slots: Object.fromEntries(Object.entries(data.slots).map(function (entry) {
          return [entry[0], entry[1].map(function (layer) {
            return Object.assign({}, layer, { pixels: decode(layer.p) });
          })];
        }))
      };

      prepared.backgrounds.forEach(function (background, index) {
        var button = document.createElement("button");
        button.type = "button";
        button.style.background = backgroundStyle(background);
        button.title = background.name;
        button.setAttribute("aria-label", background.name);
        button.setAttribute("aria-pressed", index === backgroundIndex ? "true" : "false");
        if (index === backgroundIndex) button.classList.add("is-selected");
        button.addEventListener("click", function () {
          backgroundIndex = index;
          swatches.querySelectorAll("button").forEach(function (item, itemIndex) {
            item.classList.toggle("is-selected", itemIndex === index);
            item.setAttribute("aria-pressed", itemIndex === index ? "true" : "false");
          });
          render();
        });
        swatches.appendChild(button);
      });

      data.zorder.forEach(function (slot) {
        var label = document.createElement("label");
        var name = document.createElement("span");
        var select = document.createElement("select");
        name.textContent = slot;
        select.setAttribute("aria-label", slot);
        var none = document.createElement("option");
        none.value = "";
        none.textContent = "None";
        select.appendChild(none);
        prepared.slots[slot].forEach(function (layer, index) {
          var option = document.createElement("option");
          option.value = String(index);
          option.textContent = layer.name;
          select.appendChild(option);
        });
        select.value = picks[slot] == null ? "" : String(picks[slot]);
        select.addEventListener("change", function () {
          picks[slot] = select.value === "" ? null : Number(select.value);
          render();
        });
        label.appendChild(name);
        label.appendChild(select);
        selectGrid.appendChild(label);
      });

      loading.hidden = true;
      shuffle.disabled = false;
      clear.disabled = false;
      save.disabled = false;
      render();
    } catch (error) {
      loading.textContent = "GENERATOR UNAVAILABLE";
      summary.textContent = "Try the standalone generator";
      var link = document.createElement("a");
      link.href = "pixelbobos.html";
      link.textContent = "Open generator ↗";
      link.target = "_blank";
      link.rel = "noopener";
      summary.appendChild(document.createTextNode(" · "));
      summary.appendChild(link);
      return;
    }

    [topText, bottomText, watermark].forEach(function (input) {
      input.addEventListener("input", render);
      input.addEventListener("change", render);
    });

    shuffle.addEventListener("click", function () {
      backgroundIndex = Math.floor(Math.random() * prepared.backgrounds.length);
      prepared.raw.zorder.forEach(function (slot) {
        var required = slot === "Mouth" || slot === "Eyes";
        picks[slot] = required || Math.random() > 0.25
          ? Math.floor(Math.random() * prepared.slots[slot].length)
          : null;
      });
      swatches.querySelectorAll("button").forEach(function (item, index) {
        item.classList.toggle("is-selected", index === backgroundIndex);
        item.setAttribute("aria-pressed", index === backgroundIndex ? "true" : "false");
      });
      selectGrid.querySelectorAll("select").forEach(function (select, index) {
        var slot = prepared.raw.zorder[index];
        select.value = picks[slot] == null ? "" : String(picks[slot]);
      });
      render();
    });

    clear.addEventListener("click", function () {
      prepared.raw.zorder.forEach(function (slot) { picks[slot] = null; });
      topText.value = "";
      bottomText.value = "";
      selectGrid.querySelectorAll("select").forEach(function (select) { select.value = ""; });
      render();
    });

    save.addEventListener("click", function () {
      canvas.toBlob(function (blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        var anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "pixel-bobo.png";
        anchor.click();
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 500);
        save.textContent = "Saved ✓";
        window.setTimeout(function () { save.textContent = "Save Pixel Bobo PNG"; }, 1800);
      }, "image/png");
    });
  }

  loadMarket();
  window.setInterval(loadMarket, 45000);
  initReveal();
  initHeroArt();
  initCopyContract();
  initGenerator();
})();
