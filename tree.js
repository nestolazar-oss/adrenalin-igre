import { readdirSync, statSync } from "fs";
import { join } from "path";

function walk(dir, indent = "") {
  const items = readdirSync(dir, { withFileTypes: true });

  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const pointer = isLast ? "└── " : "├── ";

    console.log(indent + pointer + item.name);

    const full = join(dir, item.name);

    if (item.isDirectory()) {
      const newIndent = indent + (isLast ? "    " : "│   ");
      walk(full, newIndent);
    }
  });
}

walk(".");
