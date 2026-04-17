type SkillTag = {
  name: string;
  colorClass: string;
};

type SkillGroup = {
  icon: string;
  title: string;
  tags: SkillTag[];
};

const skillGroups: SkillGroup[] = [
  {
    icon: "LG",
    title: "Language",
    tags: [
      { name: "TypeScript", colorClass: "bg-blue-600" },
      { name: "JavaScript", colorClass: "bg-yellow-500 text-black" },
      { name: "Python", colorClass: "bg-sky-700" },
      { name: "Java", colorClass: "bg-red-600" },
    ],
  },
  {
    icon: "FE",
    title: "Frontend",
    tags: [
      { name: "Next.js / React", colorClass: "bg-black" },
      { name: "React Hook Form", colorClass: "bg-slate-900" },
      { name: "Tailwind CSS", colorClass: "bg-cyan-500" },
      { name: "Emotion", colorClass: "bg-fuchsia-600" },
      { name: "Bootstrap", colorClass: "bg-purple-700" },
    ],
  },
  {
    icon: "BE",
    title: "Backend",
    tags: [
      { name: "Spring Boot", colorClass: "bg-lime-600" },
      { name: "Gradle", colorClass: "bg-teal-900" },
      { name: "Nest.js", colorClass: "bg-rose-700" },
      { name: "Prisma", colorClass: "bg-slate-700" },
      { name: "MySQL", colorClass: "bg-blue-700" },
      { name: "MariaDB", colorClass: "bg-cyan-700" },
      { name: "Oracle", colorClass: "bg-red-700" },
      { name: "PostgreSQL", colorClass: "bg-indigo-700" },
    ],
  },
  {
    icon: "OP",
    title: "DevOps",
    tags: [
      { name: "Docker", colorClass: "bg-blue-600" },
      { name: "AWS (ECS, EB)", colorClass: "bg-amber-500 text-black" },
      { name: "Redis", colorClass: "bg-red-500" },
      { name: "Kafka", colorClass: "bg-slate-800" },
    ],
  },
];

export default function SkillsArchivePanel() {
  return (
    <div className="h-full overflow-hidden">
      <section className="flex h-1/2 items-center bg-[#d6d9de] px-4 py-4 md:py-6">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-8 text-center">
            <p className="text-4xl font-black tracking-tight text-black md:text-5xl">
              LINK SKILLS
            </p>
            <div className="mx-auto mt-3 h-[2px] w-56 bg-slate-700" />
          </div>

          <div className="rounded-2xl border border-slate-300 bg-[#eef1f4] p-4 shadow-[0_16px_35px_rgba(0,0,0,0.20)] md:p-6">
            <div className="space-y-4">
              {skillGroups.map((group) => (
                <div key={group.title} className="grid items-start gap-3 md:grid-cols-[170px_1fr]">
                  <div className="flex items-center gap-2 text-lg font-bold text-black">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-400 bg-slate-100 text-xs font-black">
                      {group.icon}
                    </span>
                    <span>{group.title}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.tags.map((tag) => (
                      <span
                        key={`${group.title}-${tag.name}`}
                        className={`${tag.colorClass} rounded-lg px-3 py-1 text-sm font-bold text-white`}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex h-1/2 items-center bg-[#1f2024] px-4 py-4 text-white md:py-6">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-6 text-center">
            <p className="text-4xl font-black tracking-tight md:text-5xl">LINK ARCHIVING</p>
            <div className="mx-auto mt-3 h-[2px] w-72 bg-white/40" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <a
              href="https://github.com/wogurwogur"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-white p-7 text-black shadow-[0_14px_32px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5"
            >
              <p className="mb-2 text-5xl font-black leading-none">GitHub</p>
              <p className="mb-2 text-xl text-blue-600">github.com/wogurwogur</p>
              <p className="text-base text-black/70">Source code and work history archive</p>
            </a>

            <a
              href="https://mystudy8531.tistory.com/"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-white p-7 text-black shadow-[0_14px_32px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5"
            >
              <p className="mb-2 text-4xl font-black leading-none md:text-5xl">기술블로그</p>
              <p className="mb-2 text-xl text-blue-600">mystudy8531.tistory.com</p>
              <p className="text-base text-black/70">Study and knowledge sharing blog</p>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
