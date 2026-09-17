// Interactive mini-terminal of the hero: typed boot sequence then command prompt.
// Commands: help, whoami, contact, stack, ls, cv, projets, apps, pdf, clear, exit…

interface BootLine {
  cmd: string;
  out: string[];
}

const base = import.meta.env.BASE_URL;
const siteUrl = (path: string) => (base === "/" ? path : base + path);

const body = document.getElementById("term-body") as HTMLDivElement;
const output = document.getElementById("term-output") as HTMLDivElement;
const input = document.getElementById("term-input") as HTMLInputElement;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const bootData = JSON.parse(
  document.getElementById("terminal-boot")?.textContent ?? "[]",
) as BootLine[];

const PROMPT = "guest@julien-chapron:~$";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function printLine(className = ""): HTMLDivElement {
  const line = document.createElement("div");
  line.className = className ? `term-line ${className}` : "term-line";
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
  return line;
}

function printEcho(command: string): HTMLDivElement {
  const line = printLine();
  const prompt = document.createElement("span");
  prompt.className = "prompt";
  prompt.textContent = PROMPT;
  const text = document.createElement("span");
  text.className = "term-cmd";
  text.textContent = ` ${command}`;
  line.append(prompt, text);
  return line;
}

function printText(text: string): void {
  printLine().textContent = text;
}

function printLink(prefix: string, label: string, href: string): void {
  const line = printLine();
  const pre = document.createElement("span");
  pre.textContent = prefix;
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  if (href.startsWith("http")) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  line.append(pre, link);
}

async function typeText(element: HTMLElement, text: string): Promise<void> {
  if (reducedMotion) {
    element.textContent = text;
    return;
  }
  for (const char of text) {
    element.textContent += char;
    await wait(12 + Math.random() * 20);
  }
}

let booted = false;

async function boot(): Promise<void> {
  for (const line of bootData) {
    const echo = printEcho("");
    const typed = echo.querySelector<HTMLElement>(".term-cmd");
    if (typed) {
      await typeText(typed, ` ${line.cmd}`);
    }
    for (const text of line.out) {
      printText(text);
    }
    await wait(250);
  }
  const hint = printLine("term-hint");
  hint.textContent = '# tapez "help" pour la liste des commandes, ou cliquez dans le terminal';
  booted = true;
  input.disabled = false;

  // The terminal occupies the second screen: giving it focus while one
  // is still on the hero would make the page jump down to it. We only take
  // it if it is already in sight, and never by scrolling, otherwise
  // the prompt stays there, one click away (that is what the hint above says).
  const box = body.getBoundingClientRect();
  if (box.top < window.innerHeight && box.bottom > 0) {
    input.focus({ preventScroll: true });
  }
}

const HELP: string[] = [
  "help    , liste des commandes",
  "whoami  , qui je suis",
  "contact , coordonnées",
  "stack   , stack technique",
  "ls      , sections du site",
  "cv      , aller au CV",
  "projets , page projets",
  "apps    , page apps",
  "pdf     , télécharger le CV (PDF)",
  "clear   , vider le terminal",
  "exit    , fermer la session",
];

function run(command: string): void {
  const name = command.trim().split(/\s+/)[0];
  switch (name) {
    case "help":
      HELP.forEach(printText);
      break;
    case "whoami":
      printText("Julien Chapron, Développeur Full-Stack · 7 ans d'expérience");
      break;
    case "contact":
      printText("📍 Lacroix-Falgarde (31), Toulouse");
      printLink("☎ ", "07 67 75 77 80", "tel:+33767757780");
      printLink("✉ ", "voyage7981@proton.me", "mailto:voyage7981@proton.me");
      printLink("⌥ ", "github.com/Gleaming0427", "https://github.com/Gleaming0427");
      printLink("⌘ ", "npmjs.com/~armored1486", "https://www.npmjs.com/~armored1486");
      break;
    case "stack":
      printText("TypeScript · React · Node.js · API REST & GraphQL · Docker / Kubernetes");
      break;
    case "ls":
      printText("cv.md   projets/   apps/   CV_Julien_Chapron.pdf");
      break;
    case "cv": {
      const section = document.querySelector<HTMLElement>(".section");
      if (!section) break;
      const lenis = (window as unknown as {
        lenis?: { scrollTo(target: HTMLElement, options?: { offset?: number; duration?: number }): void };
      }).lenis;
      if (lenis) {
        lenis.scrollTo(section, { offset: -80, duration: 1.1 });
      } else {
        section.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
      }
      break;
    }
    case "projets":
    case "projects":
      window.location.href = siteUrl("/projets");
      break;
    case "apps":
      window.location.href = siteUrl("/apps");
      break;
    case "pdf":
      window.open(siteUrl("/CV_Julien_Chapron.pdf"), "_blank");
      break;
    case "clear":
      output.replaceChildren();
      break;
    case "sudo":
      printText("Permission denied, this incident will be reported. 🙃");
      break;
    case "exit":
      printText("logout, rafraîchissez la page pour relancer la session 😉");
      input.blur();
      break;
    case "":
      break;
    default:
      printText(`bash: ${name}: commande inconnue, tapez "help"`);
  }
}

const history: string[] = [];
let historyIndex = 0;

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const command = input.value.trim();
    if (command) {
      printEcho(command);
      run(command);
      history.push(command);
      historyIndex = history.length;
      input.value = "";
    }
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    if (historyIndex > 0) {
      historyIndex -= 1;
      input.value = history[historyIndex] ?? "";
    }
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    if (historyIndex < history.length) {
      historyIndex += 1;
      input.value = historyIndex === history.length ? "" : (history[historyIndex] ?? "");
    }
  } else if (event.key === "Escape") {
    input.blur();
  }
});

// Clicking anywhere in the terminal (outside links) gives the focus back to the input.
body.addEventListener("click", (event) => {
  if (booted && !(event.target as HTMLElement).closest("a")) {
    input.focus();
  }
});

void boot();
