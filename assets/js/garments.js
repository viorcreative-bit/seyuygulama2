/*
 * Teknik çizim (flat sketch) üreticisi
 * ---------------------------------------------------------------
 * Ürün fotoğrafı olmayan ürünler için, üretimde kullanılan teknik
 * çizimlere benzer SVG görseller üretir. Renk, CSS değişkenleriyle
 * değiştirilir; ölçü çizgileri seçilen bedene göre eklenir.
 */
(function () {
  "use strict";

  var INK = "#191C2B";

  function path(d, cls) {
    return '<path d="' + d + '" class="' + cls + '"/>';
  }

  /* İki kenar arasında ribana (fitil) çizgileri */
  function ribLines(a1, a2, b1, b2, n) {
    var out = "";
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n;
      var x1 = a1[0] + (a2[0] - a1[0]) * t;
      var y1 = a1[1] + (a2[1] - a1[1]) * t;
      var x2 = b1[0] + (b2[0] - b1[0]) * t;
      var y2 = b1[1] + (b2[1] - b1[1]) * t;
      out += path("M" + x1.toFixed(1) + "," + y1.toFixed(1) + " L" + x2.toFixed(1) + "," + y2.toFixed(1), "g-rib");
    }
    return out;
  }

  function verticalRibs(x1, x2, y1, y2, step) {
    var out = "";
    for (var x = x1; x <= x2; x += step) {
      out += path("M" + x + "," + y1 + " L" + x + "," + y2, "g-rib");
    }
    return out;
  }

  /* ---------- Kalıplar ---------- */

  function tee(variant) {
    var vneck = variant === "vneck";
    var outline =
      "M162,58 " + (vneck ? "L200,104 L238,58" : "Q200,100 238,58") +
      " L300,78 L356,140 L322,170 L294,142 L296,404 Q200,412 104,404 L106,142 L78,170 L44,140 L100,78 Z";
    var inside = vneck ? "M162,58 Q200,68 238,58 L200,104 Z" : "M162,58 Q200,68 238,58 Q200,100 162,58 Z";
    var neckStitch = vneck ? "M168,64 L200,114 L232,64" : "M168,63 Q200,108 232,63";
    return {
      viewBox: [20, 34, 360, 402],
      parts:
        path(outline, "g-body") +
        path(inside, "g-shade") +
        path(neckStitch, "g-stitch") +
        path("M300,78 Q288,112 294,142", "g-line") +
        path("M100,78 Q112,112 106,142", "g-line") +
        path("M350,134 L316,164", "g-stitch") +
        path("M50,134 L84,164", "g-stitch") +
        path("M105,394 Q200,402 295,394", "g-stitch"),
      h: { x1: 106, x2: 294, y: 176 },
      v: { x: 250, y1: 62, y2: 406 },
    };
  }

  function polo() {
    var outline =
      "M162,58 Q200,92 238,58 L300,78 L356,140 L322,170 L294,142 L296,404 Q200,412 104,404 L106,142 L78,170 L44,140 L100,78 Z";
    return {
      viewBox: [20, 26, 360, 410],
      parts:
        path(outline, "g-body") +
        path("M300,78 Q288,112 294,142", "g-line") +
        path("M100,78 Q112,112 106,142", "g-line") +
        path("M350,134 L316,164", "g-line") +
        path("M50,134 L84,164", "g-line") +
        path("M105,394 Q200,402 295,394", "g-stitch") +
        '<rect x="190" y="84" width="20" height="74" class="g-body"/>' +
        path("M194,88 L194,154", "g-stitch") +
        '<circle cx="200" cy="108" r="3.6" class="g-hw"/>' +
        '<circle cx="200" cy="136" r="3.6" class="g-hw"/>' +
        path("M200,50 L162,54 L150,72 L184,106 L200,86 Z", "g-body") +
        path("M200,50 L238,54 L250,72 L216,106 L200,86 Z", "g-body") +
        path("M158,62 L182,96", "g-stitch") +
        path("M242,62 L218,96", "g-stitch"),
      h: { x1: 106, x2: 294, y: 186 },
      v: { x: 262, y1: 66, y2: 406 },
    };
  }

  /* Sweatshirt ve kapüşonlu için ortak gövde */
  function sweatBody() {
    var outline =
      "M162,58 Q200,100 238,58 L300,76 Q336,92 348,150 L376,366 L382,404 L342,410 L336,372 L304,186 " +
      "L304,366 L306,408 Q200,414 94,408 L96,366 L96,186 L64,372 L58,410 L18,404 L24,366 L52,150 Q64,92 100,76 Z";
    return (
      path(outline, "g-body") +
      path("M300,76 Q292,130 304,186", "g-line") +
      path("M100,76 Q108,130 96,186", "g-line") +
      path("M376,366 L336,372", "g-line") +
      path("M24,366 L64,372", "g-line") +
      ribLines([376, 366], [336, 372], [382, 404], [342, 410], 5) +
      ribLines([24, 366], [64, 372], [18, 404], [58, 410], 5) +
      path("M96,366 L304,366", "g-line") +
      verticalRibs(104, 296, 371, 405, 8)
    );
  }

  function sweat() {
    return {
      viewBox: [-6, 34, 412, 404],
      parts:
        sweatBody() +
        path("M162,58 Q200,68 238,58 Q200,100 162,58 Z", "g-shade") +
        path("M166,62 Q200,112 234,62", "g-line"),
      h: { x1: 96, x2: 304, y: 200 },
      v: { x: 250, y1: 62, y2: 409 },
    };
  }

  function hoodie(variant) {
    var zip = variant === "zip";
    var parts =
      sweatBody() +
      path("M146,262 L254,262 L276,330 L282,366 L118,366 L124,330 Z", "g-body") +
      path("M152,270 L248,270", "g-stitch") +
      path("M150,86 C136,24 168,2 200,2 C232,2 264,24 250,86 L226,104 L200,110 L174,104 Z", "g-body") +
      path("M174,100 C166,52 180,26 200,26 C220,26 234,52 226,100 L200,108 Z", "g-shade") +
      path("M164,96 C154,44 176,16 200,16 C224,16 246,44 236,96", "g-stitch");
    if (zip) {
      parts +=
        path("M200,110 L200,408", "g-teeth") +
        path("M200,110 L200,408", "g-line") +
        '<rect x="195" y="114" width="10" height="20" rx="2" class="g-hw"/>';
    }
    parts +=
      '<circle cx="186" cy="106" r="3" class="g-shade"/>' +
      '<circle cx="214" cy="106" r="3" class="g-shade"/>' +
      path("M186,106 C184,130 182,160 183,182", "g-cord") +
      path("M214,106 C216,130 218,160 217,182", "g-cord") +
      '<rect x="180" y="180" width="6" height="13" rx="2" class="g-hw"/>' +
      '<rect x="214" y="180" width="6" height="13" rx="2" class="g-hw"/>';
    return {
      viewBox: [-6, -22, 412, 460],
      parts: parts,
      h: { x1: 96, x2: 304, y: 214 },
      v: { x: 290, y1: 74, y2: 409 },
    };
  }

  function pants(variant) {
    var outline, legDetails, sideX, v, viewBox;
    if (variant === "shorts") {
      outline = "M110,34 L290,34 L292,76 L310,236 L214,246 L200,160 L186,246 L90,236 L108,76 Z";
      legDetails = path("M309,226 L215,236", "g-stitch") + path("M91,226 L185,236", "g-stitch");
      sideX = 300;
      v = { x: 272, y1: 34, y2: 240 };
      viewBox = [40, 0, 320, 270];
    } else if (variant === "straight") {
      outline = "M110,34 L290,34 L292,76 L306,410 L222,410 L200,152 L178,410 L94,410 L108,76 Z";
      legDetails = path("M305,400 L222,400", "g-stitch") + path("M178,400 L95,400", "g-stitch");
      sideX = 295;
      v = { x: 272, y1: 34, y2: 410 };
      viewBox = [40, 0, 320, 436];
    } else {
      outline =
        "M110,34 L290,34 L292,76 L312,354 L304,366 L304,410 L240,410 L240,366 L232,354 L200,148 " +
        "L168,354 L160,366 L160,410 L96,410 L96,366 L88,354 L108,76 Z";
      legDetails =
        path("M304,366 L240,366", "g-line") +
        path("M160,366 L96,366", "g-line") +
        verticalRibs(246, 298, 370, 406, 8) +
        verticalRibs(102, 154, 370, 406, 8);
      sideX = 297;
      v = { x: 272, y1: 34, y2: 410 };
      viewBox = [40, 0, 320, 436];
    }
    var leftSide = 400 - sideX;
    return {
      viewBox: viewBox,
      parts:
        path(outline, "g-body") +
        path("M108,76 L292,76", "g-line") +
        verticalRibs(118, 282, 40, 70, 8) +
        path("M200,76 L200,148", "g-line") +
        path("M152,76 Q130,108 " + leftSide + ",150", "g-line") +
        path("M248,76 Q270,108 " + sideX + ",150", "g-line") +
        legDetails +
        '<circle cx="192" cy="58" r="3" class="g-shade"/>' +
        '<circle cx="208" cy="58" r="3" class="g-shade"/>' +
        path("M192,58 C188,92 184,112 187,130", "g-cord") +
        path("M208,58 C212,92 216,112 213,130", "g-cord") +
        '<rect x="184" y="128" width="6" height="12" rx="2" class="g-hw"/>' +
        '<rect x="210" y="128" width="6" height="12" rx="2" class="g-hw"/>',
      h: { x1: 110, x2: 290, y: 16 },
      v: v,
    };
  }

  function dress() {
    var outline =
      "M166,40 Q200,78 234,40 L286,56 L322,104 L298,128 L276,108 L318,420 Q200,436 82,420 L124,108 L102,128 L78,104 L114,56 Z";
    return {
      viewBox: [50, 16, 300, 436],
      parts:
        path(outline, "g-body") +
        path("M166,40 Q200,50 234,40 Q200,78 166,40 Z", "g-shade") +
        path("M172,45 Q200,86 228,45", "g-stitch") +
        path("M286,56 Q276,84 276,108", "g-line") +
        path("M114,56 Q124,84 124,108", "g-line") +
        path("M318,98 L294,122", "g-stitch") +
        path("M82,98 L106,122", "g-stitch") +
        path("M86,410 Q200,426 314,410", "g-stitch"),
      h: { x1: 121, x2: 279, y: 132 },
      v: { x: 250, y1: 45, y2: 426 },
    };
  }

  var BUILDERS = {
    tee: tee,
    polo: polo,
    sweat: sweat,
    hoodie: hoodie,
    jogger: pants,
    dress: dress,
  };

  /* ---------- Renk yardımcıları ---------- */

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.replace(/(.)/g, "$1$1");
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function luminance(hex) {
    var c = hexToRgb(hex).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function shade(hex, amount) {
    var c = hexToRgb(hex).map(function (v) {
      return Math.round(v * (1 - amount));
    });
    return "rgb(" + c.join(",") + ")";
  }

  function colorVars(hex) {
    var dark = luminance(hex) < 0.18;
    return {
      "--g-fill": hex,
      "--g-shade": shade(hex, dark ? 0.35 : 0.22),
      "--g-stitch": dark ? "rgba(255,255,255,.55)" : "rgba(25,28,43,.42)",
      "--g-dim": dark ? "#F2C12E" : "#26357A",
    };
  }

  function styleString(vars) {
    return Object.keys(vars)
      .map(function (k) {
        return k + ":" + vars[k];
      })
      .join(";");
  }

  /* ---------- Ölçü çizgileri ---------- */

  function tag(cx, cy, text) {
    var w = text.length * 8.4 + 18;
    return (
      '<g class="g-tag" transform="translate(' + cx + " " + cy + ')">' +
      '<rect x="' + -w / 2 + '" y="-12" width="' + w + '" height="24" rx="3"/>' +
      '<text x="0" y="0" dy="0.36em" text-anchor="middle">' + text + "</text></g>"
    );
  }

  function dimLines(geo, dims, transformX) {
    var out = "";
    var tx = transformX || function (x) {
      return x;
    };
    if (dims.h != null) {
      var x1 = tx(geo.h.x1);
      var x2 = tx(geo.h.x2);
      var y = geo.h.y;
      out +=
        '<g class="g-dim">' +
        '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '"/>' +
        '<line x1="' + x1 + '" y1="' + (y - 8) + '" x2="' + x1 + '" y2="' + (y + 8) + '"/>' +
        '<line x1="' + x2 + '" y1="' + (y - 8) + '" x2="' + x2 + '" y2="' + (y + 8) + '"/>' +
        "</g>" +
        tag((x1 + x2) / 2, y, dims.h + " cm");
    }
    if (dims.v != null) {
      var x = tx(geo.v.x);
      var y1 = geo.v.y1;
      var y2 = geo.v.y2;
      out +=
        '<g class="g-dim">' +
        '<line x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '"/>' +
        '<line x1="' + (x - 8) + '" y1="' + y1 + '" x2="' + (x + 8) + '" y2="' + y1 + '"/>' +
        '<line x1="' + (x - 8) + '" y1="' + y2 + '" x2="' + (x + 8) + '" y2="' + y2 + '"/>' +
        "</g>" +
        tag(x, (y1 + y2) / 2 + 24, dims.v + " cm");
    }
    return out;
  }

  /*
   * garmentSVG(type, options)
   *   type:    tee | polo | sweat | hoodie | jogger | dress
   *   options: { variant, color (hex), label, dims: { h: 53, v: 72 } }
   */
  function garmentSVG(type, options) {
    var o = options || {};
    var build = BUILDERS[type] || tee;
    var geo = build(o.variant);
    var vb = geo.viewBox.slice();
    var parts = geo.parts;
    var tx = null;

    // Oversize: yatayda genişletilmiş kalıp
    if (o.variant === "oversize") {
      var k = 1.1;
      parts = '<g transform="matrix(' + k + ' 0 0 1 ' + 200 * (1 - k) + ' 0)">' + parts + "</g>";
      tx = function (x) {
        return Math.round(k * x + 200 * (1 - k));
      };
      vb[0] = tx(vb[0]);
      vb[2] = Math.round(vb[2] * k);
    }

    var dims = o.dims ? dimLines(geo, o.dims, tx) : "";
    var style = styleString(colorVars(o.color || "#B7BABF"));
    var label = o.label ? ' role="img" aria-label="' + o.label + '"' : ' aria-hidden="true"';

    return (
      '<svg class="garment" viewBox="' + vb.join(" ") + '" preserveAspectRatio="xMidYMid meet"' +
      label + ' style="' + style + '" xmlns="http://www.w3.org/2000/svg">' +
      parts + dims + "</svg>"
    );
  }

  function recolor(svg, hex) {
    if (!svg) return;
    var vars = colorVars(hex);
    Object.keys(vars).forEach(function (k) {
      svg.style.setProperty(k, vars[k]);
    });
  }

  window.LazioGarments = {
    svg: garmentSVG,
    recolor: recolor,
    ink: INK,
  };
})();
