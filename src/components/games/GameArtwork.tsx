import type { GameRouteId } from "@/constants/gameIds";

const hues = ["lavender", "peach", "mint", "blue"] as const;
const routeOrder: GameRouteId[] = [
  "balloon",
  "basketball",
  "tank-arena",
  "whack",
  "runner",
  "tetris",
  "snake",
  "memory",
  "2048",
  "piano",
  "math",
  "counting",
  "odd-one-out",
  "shapematch",
  "simonsays",
  "codingturtle",
  "spaceshooter",
  "connect-four",
  "word-search",
  "color-sort",
];
const Tiles = ({ values }: { values: string[] }) => (
  <>
    {values.map((value, i) => (
      <g
        key={i}
        transform={
          "translate(" +
          (70 + (i % 3) * 57) +
          " " +
          (32 + Math.floor(i / 3) * 54) +
          ")"
        }
      >
        <rect
          width="47"
          height="45"
          rx="9"
          fill={i % 2 ? "#fffdf4" : "#34314d"}
          opacity={i % 2 ? ".9" : ".85"}
        />
        <text
          x="23.5"
          y="30"
          textAnchor="middle"
          fill={i % 2 ? "#34314d" : "#fffdf4"}
          fontSize="23"
          fontWeight="700"
        >
          {value}
        </text>
      </g>
    ))}
  </>
);
/** Game-specific, local vector covers remain crisp at every screen density. */
export default function GameArtwork({
  id,
  className = "",
}: {
  id: GameRouteId;
  className?: string;
}) {
  const tone = hues[Math.max(0, routeOrder.indexOf(id)) % hues.length];
  let art;
  switch (id) {
    case "balloon":
      art = (
        <>
          <path
            d="M113 85q-20 39 7 76M181 90q27 35 5 77"
            stroke="#34314d"
            strokeWidth="2"
          />
          <ellipse
            cx="113"
            cy="65"
            rx="30"
            ry="39"
            fill="#8366ad"
            transform="rotate(-17 113 65)"
          />
          <ellipse
            cx="181"
            cy="74"
            rx="32"
            ry="40"
            fill="#f6d486"
            transform="rotate(15 181 74)"
          />
          <ellipse cx="101" cy="51" rx="5" ry="12" fill="#fff" opacity=".5" />
          <path d="m111 102-6 8 13 1M184 114l-6 8 12-1" fill="#34314d" />
        </>
      );
      break;
    case "basketball":
      art = (
        <>
          <path d="M205 29v38h-48v-38h48Z" stroke="#34314d" strokeWidth="3" />
          <path
            d="M161 67h39M165 71l7 24h15l8-24M173 71l5 24M187 71l-4 24"
            stroke="#34314d"
            strokeWidth="2"
          />
          <circle
            cx="117"
            cy="111"
            r="37"
            fill="#e89769"
            stroke="#34314d"
            strokeWidth="3"
          />
          <path
            d="M82 98q39-3 66 27M93 140q-9-38 45-58"
            stroke="#34314d"
            strokeWidth="2"
          />
          <path
            d="m133 43 7-11m-27 20 3-12"
            stroke="#34314d"
            strokeWidth="2"
            opacity=".4"
          />
        </>
      );
      break;
    case "tetris":
      art = (
        <>
          {[
            [104, 36],
            [104, 70],
            [138, 70],
            [172, 70],
            [70, 113],
            [104, 113],
            [138, 113],
            [172, 113],
          ].map(([x, y], i) => (
            <rect
              key={i}
              x={x}
              y={y}
              width="29"
              height="29"
              rx="5"
              fill={i < 4 ? "#81669f" : "#fffdf4"}
            />
          ))}
        </>
      );
      break;
    case "snake":
      art = (
        <>
          <path
            d="M93 127V68q0-24 24-24h21q24 0 24 24v19q0 22 23 22h19"
            stroke="#4a7d60"
            strokeWidth="30"
            strokeLinecap="round"
          />
          <circle cx="203" cy="104" r="3.5" fill="#fff" />
          <circle cx="203" cy="116" r="3.5" fill="#fff" />
          <circle cx="67" cy="98" r="10" fill="#cb796a" />
          <path d="m64 89 5-8" stroke="#4a7d60" strokeWidth="3" />
        </>
      );
      break;
    case "piano":
      art = (
        <>
          <rect x="65" y="47" width="170" height="94" rx="13" fill="#34314d" />
          {Array.from({ length: 7 }, (_, i) => (
            <rect
              key={i}
              x={74 + i * 22}
              y="58"
              width="19"
              height="72"
              rx="3"
              fill="#fffdf4"
            />
          ))}
          {[0, 1, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x={87 + i * 22}
              y="57"
              width="13"
              height="43"
              rx="2"
              fill="#34314d"
            />
          ))}
          <text x="225" y="36" fontSize="25" fill="#34314d">
            ♪
          </text>
        </>
      );
      break;
    case "math":
      art = (
        <>
          <text
            x="150"
            y="111"
            textAnchor="middle"
            fontSize="63"
            fontWeight="800"
            fill="#34314d"
            transform="rotate(-9 150 90)"
          >
            2 + 3
          </text>
          <circle cx="230" cy="49" r="16" fill="#fffdf4" />
          <text x="230" y="55" textAnchor="middle" fontSize="22" fill="#34314d">
            ?
          </text>
        </>
      );
      break;
    case "2048":
      art = <Tiles values={["2", "4", "8", "16", "32", "64"]} />;
      break;
    case "memory":
      art = <Tiles values={["✦", "✦", "?", "?", "●", "●"]} />;
      break;
    case "word-search":
      art = <Tiles values={["O", "Y", "U", "N", "A", "K"]} />;
      break;
    case "counting":
      art = (
        <>
          {Array.from({ length: 5 }, (_, i) => (
            <circle
              key={i}
              cx={80 + i * 33}
              cy={80 + (i % 2) * 25}
              r="15"
              fill={i % 2 ? "#fffdf4" : "#81669f"}
            />
          ))}
          <text
            x="150"
            y="150"
            textAnchor="middle"
            fontSize="22"
            fill="#34314d"
          >
            1 · 2 · 3 · 4 · 5
          </text>
        </>
      );
      break;
    case "connect-four":
      art = (
        <>
          <rect x="75" y="28" width="150" height="130" rx="14" fill="#34314d" />
          {Array.from({ length: 20 }, (_, i) => (
            <circle
              key={i}
              cx={94 + (i % 5) * 28}
              cy={47 + Math.floor(i / 5) * 30}
              r="10"
              fill={i > 10 ? (i % 2 ? "#edac90" : "#c6b7ec") : "#fffdf4"}
            />
          ))}
        </>
      );
      break;
    case "color-sort":
      art = (
        <>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect
                x={87 + i * 47}
                y="35"
                width="34"
                height="105"
                rx="16"
                stroke="#34314d"
                strokeWidth="2"
                fill="#fffdf4"
              />
              {[0, 1, 2].map((j) => (
                <rect
                  key={j}
                  x={91 + i * 47}
                  y={120 - j * 26}
                  width="26"
                  height="20"
                  rx="5"
                  fill={["#81bda9", "#c6b7ec", "#edac90"][(i + j) % 3]}
                />
              ))}
            </g>
          ))}
        </>
      );
      break;
    case "shapematch":
      art = (
        <>
          <circle cx="100" cy="100" r="31" fill="#fffdf4" />
          <path d="m161 48 40 70h-80Z" fill="#81669f" />
          <rect x="181" y="104" width="44" height="44" rx="8" fill="#4a7d60" />
        </>
      );
      break;
    case "simonsays":
      art = (
        <>
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={94 + (i % 2) * 59}
              y={34 + Math.floor(i / 2) * 59}
              width="52"
              height="52"
              rx="20"
              fill={["#81669f", "#fffdf4", "#81bda9", "#edac90"][i]}
            />
          ))}
        </>
      );
      break;
    case "odd-one-out":
      art = (
        <>
          {Array.from({ length: 6 }, (_, i) => (
            <g
              key={i}
              transform={
                "translate(" +
                (85 + (i % 3) * 63) +
                " " +
                (57 + Math.floor(i / 3) * 61) +
                ")"
              }
            >
              {i === 4 ? (
                <path d="m0-21 21 37h-42Z" fill="#34314d" />
              ) : (
                <circle r="20" fill="#fffdf4" />
              )}
            </g>
          ))}
        </>
      );
      break;
    case "spaceshooter":
      art = (
        <>
          <path d="M150 29q-40 36-26 81h52q14-45-26-81Z" fill="#fffdf4" />
          <path d="m124 81-27 35 26-3m53-32 27 35-26-3" fill="#81669f" />
          <circle
            cx="150"
            cy="68"
            r="13"
            fill="#81bda9"
            stroke="#34314d"
            strokeWidth="2"
          />
          <path d="m135 117 15 35 15-35Z" fill="#e89769" />
          <circle cx="214" cy="49" r="4" fill="#34314d" />
          <circle cx="92" cy="46" r="3" fill="#34314d" />
        </>
      );
      break;
    case "tank-arena":
      art = (
        <>
          <rect x="83" y="79" width="132" height="48" rx="21" fill="#34314d" />
          {[103, 130, 157, 184].map((x) => (
            <circle key={x} cx={x} cy="104" r="10" fill="#fffdf4" />
          ))}
          <rect x="108" y="52" width="77" height="37" rx="14" fill="#81bda9" />
          <path
            d="M166 64h65"
            stroke="#34314d"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </>
      );
      break;
    case "whack":
      art = (
        <>
          <ellipse
            cx="150"
            cy="130"
            rx="73"
            ry="19"
            fill="#34314d"
            opacity=".25"
          />
          <path d="M110 126V78a40 40 0 0 1 80 0v48" fill="#8c7383" />
          <circle cx="132" cy="84" r="5" fill="#34314d" />
          <circle cx="168" cy="84" r="5" fill="#34314d" />
          <ellipse cx="150" cy="103" rx="10" ry="7" fill="#edac90" />
          <path
            d="m86 47-10-15m25 9-1-16"
            stroke="#34314d"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      );
      break;
    case "runner":
      art = (
        <>
          <path
            d="M51 143q67-62 141 0t67 0"
            stroke="#81bda9"
            strokeWidth="22"
          />
          <ellipse cx="142" cy="95" rx="31" ry="29" fill="#fffdf4" />
          <ellipse
            cx="127"
            cy="54"
            rx="9"
            ry="29"
            fill="#fffdf4"
            transform="rotate(-14 127 54)"
          />
          <ellipse
            cx="148"
            cy="53"
            rx="9"
            ry="29"
            fill="#fffdf4"
            transform="rotate(9 148 53)"
          />
          <circle cx="151" cy="85" r="4" fill="#34314d" />
          <path d="m189 53 9-18 9 18-9-3Z" fill="#e89769" />
        </>
      );
      break;
    case "codingturtle":
      art = (
        <>
          <path
            d="m87 70-25 23 25 23m126-46 25 23-25 23"
            stroke="#34314d"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <ellipse cx="150" cy="102" rx="33" ry="29" fill="#fffdf4" />
          <ellipse cx="139" cy="63" rx="9" ry="25" fill="#fffdf4" />
          <ellipse cx="160" cy="61" rx="9" ry="25" fill="#fffdf4" />
          <circle cx="139" cy="97" r="4" fill="#34314d" />
          <circle cx="160" cy="97" r="4" fill="#34314d" />
          <path d="m179 128 20-12-10 26Z" fill="#e89769" />
        </>
      );
      break;
    default:
      art = <Tiles values={["●", "◆", "✦", "✦", "◆", "●"]} />;
  }
  return (
    <div
      className={"garden-artwork garden-artwork-" + tone + " " + className}
      aria-hidden="true"
    >
      <svg viewBox="0 0 300 180" fill="none">
        <circle cx="250" cy="160" r="70" fill="#fffdf4" opacity=".13" />
        <circle cx="40" cy="12" r="60" fill="#34314d" opacity=".035" />
        {art}
      </svg>
    </div>
  );
}
