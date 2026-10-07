/** Original vector character; no network assets or animation during gameplay. */
export default function GardenCharacter() {
  return (
    <div className="garden-character" aria-hidden="true">
      <svg viewBox="0 0 480 400" fill="none">
        <ellipse
          cx="238"
          cy="206"
          rx="188"
          ry="140"
          stroke="currentColor"
          opacity=".12"
          transform="rotate(-23 238 206)"
        />
        <path
          d="M109 226C93 124 165 57 263 83c97 26 120 116 78 210-27 62-138 70-191 45-42-20-28-45-41-112Z"
          fill="#a7d9c7"
        />
        <path
          d="M109 226c13 67-1 92 41 112 53 25 164 17 191-45 6-13 10-26 14-39-59 66-155 78-246-28Z"
          fill="#81bda9"
          opacity=".5"
        />
        <ellipse
          cx="205"
          cy="198"
          rx="19"
          ry="26"
          fill="#fffdf8"
          transform="rotate(10 205 198)"
        />
        <ellipse
          cx="269"
          cy="188"
          rx="19"
          ry="26"
          fill="#fffdf8"
          transform="rotate(10 269 188)"
        />
        <ellipse cx="209" cy="201" rx="7" ry="12" fill="#203f38" />
        <ellipse cx="272" cy="191" rx="7" ry="12" fill="#203f38" />
        <path
          d="M218 235q25 25 51-7"
          stroke="#203f38"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <ellipse cx="187" cy="236" rx="13" ry="7" fill="#eba98f" />
        <ellipse cx="290" cy="220" rx="13" ry="7" fill="#eba98f" />
        <path
          d="m373 39 12 28 30-8-14 28 23 21-31 3-8 30-15-27-30 2 17-25-11-28 28 8Z"
          fill="#c8bcf3"
        />
        <circle
          cx="83"
          cy="297"
          r="40"
          fill="#e9b394"
          stroke="#34314d"
          strokeWidth="2"
        />
        <path
          d="M47 281q49 1 65 37M63 330q-3-48 39-68"
          stroke="#34314d"
          strokeWidth="2"
        />
        <path
          d="M58 105q-12 6-15 20M47 101q1 16 15 21"
          stroke="#c8bcf3"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="394" cy="277" r="4" fill="#c8bcf3" />
        <circle cx="111" cy="54" r="3" fill="#e9b394" />
      </svg>
      <span className="garden-character-note">
        KÜÇÜK BİR OYUN. KOCAMAN BİR HAYAL.
      </span>
    </div>
  );
}
