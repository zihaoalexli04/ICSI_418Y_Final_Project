import fourYearPlanCourseData from "./four-year-plan-courses.json";

export type Course = {
  id: string;
  code: string;
  title: string;
  dept: string;
  credits: number;
  desc: string;
  prereqs: string[];
};

function readTextField(
  record: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function readNumberField(
  record: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function readPrereqField(record: Record<string, unknown>) {
  const raw = record.prereqs ?? record.prerequisites ?? record.prerequisite ?? "";
  if (Array.isArray(raw)) {
    return raw
      .filter((value): value is string => typeof value === "string")
      .map((value) => normalizeCourseId(value))
      .filter(Boolean);
  }

  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(/[;,/]/)
      .map((value) => normalizeCourseId(value))
      .filter(Boolean);
  }

  return [];
}

function buildCourseCode(record: Record<string, unknown>) {
  const directCode = readTextField(record, [
    "full_code",
    "fullCode",
    "code",
    "course_code",
    "courseCode",
    "course",
  ]);

  if (directCode) {
    return directCode;
  }

  const subject = readTextField(record, [
    "subject",
    "subject_code",
    "subjectCode",
    "department_code",
    "departmentCode",
    "dept_code",
    "deptCode",
  ]);
  const number = readTextField(record, [
    "catalog_number",
    "catalogNumber",
    "course_number",
    "courseNumber",
    "number",
    "course_no",
    "courseNo",
  ]);
  const suffix = readTextField(record, ["suffix", "course_suffix", "courseSuffix"]);

  if (subject && number) {
    return `${subject} ${number}${suffix}`;
  }

  return "";
}

export type RequirementBucket = {
  id: string;
  label: string;
  need: number;
  courses: string[];
};

export type GenEdCategory = {
  code: string;
  label: string;
  options: string[];
};

type FourYearPlanCourseData = {
  majors: Record<string, string[]>;
};

const fourYearPlanCoursesByRawMajor = (fourYearPlanCourseData as FourYearPlanCourseData).majors;

const rawAvailableMajors = [
  "BA Accounting",
  "BA Africana Studies",
  "BA Anthropology",
  "BA Art History",
  "BA Biology",
  "BA Chemistry",
  "BA Chinese Studies",
  "BA Communication",
  "BA Computer Science",
  "BA Documentary Studies",
  "BA East Asian Studies",
  "BA East Asian Studies Comparative Track",
  "BA East Asian Studies Korean Studies Concentration",
  "BA Economics",
  "BA Emergency Preparedness, Homeland Security and Cybersecurity Homeland Security Concentration",
  "BA English",
  "BA English Writing Concentration",
  "BA Environmental Studies",
  "BA Environmental Studies Ecosystems Focus",
  "BA Geography",
  "BA Globalization Studies",
  "BA History",
  "BA Japanese Studies",
  "BA Journalism",
  "BA Latin American, Caribbean and U.S. Latino Studies",
  "BA Linguistics",
  "BA Mathematics",
  "BA Medieval and Renaissance Studies",
  "BA Music",
  "BA Philosophy",
  "BA Political Science",
  "BA Psychology",
  "BA Public Policy and Management",
  "BA Sociology",
  "BA Spanish",
  "BA Spanish Heritage Speaker",
  "BA Spanish High School Experience",
  "BA Spanish No Prior Experience",
  "BA Theatre",
  "BA Urban Studies and Planning",
  "BA Women's Gender and Sexuality Studies",
  "BS Actuarial and Mathematical Sciences",
  "BS Adolescent Education Biology",
  "BS Adolescent Education Chemistry",
  "BS Adolescent Education Earth Science",
  "BS Adolescent Education English",
  "BS Adolescent Education Math",
  "BS Adolescent Education Physics",
  "BS Adolescent Education Social Studies",
  "BS Adolescent Education Spanish (Heritage Speaker)",
  "BS Adolescent Education Spanish (Non-Heritage Speaker)",
  "BS Art",
  "BS Atmospheric Science",
  "BS Biochemistry and Molecular Biology",
  "BS Biology",
  "BS Business Administration",
  "BS Business Economics",
  "BS Chemistry Biopharma Emphasis",
  "BS Chemistry Chemical Biological",
  "BS Chemistry Chemistry Emphasis",
  "BS Chemistry Forensic Chemistry",
  "BS Childhood and Special Education",
  "BS Climate Science",
  "BS Computer Science & Applied Mathematics (CSMAT) Data Analytics Concentration",
  "BS Computer Science & Applied Mathematics (CSMAT) General Concentration",
  "BS Computer Science",
  "BS Criminal Justice",
  "BS Cybersecurity Cyber Defense Concentration",
  "BS Cybersecurity Cyber Operations Concentration",
  "BS Cybersecurity Cyber Risk Management and Policy Concentration",
  "BS Digital Forensics",
  "BS Early Childhood Childhood Education",
  "BS Electrical and Computer Engineering",
  "BS Electrical and Computer Engineering Alternate",
  "BS Emergency Preparedness, Homeland Security and Cybersecurity",
  "BS Emergency Preparedness, Homeland Security and Cybersecurity Emergency Preparedness Concentration",
  "BS Environmental Science Climate Change",
  "BS Environmental Science Ecosystems",
  "BS Environmental Science Geography",
  "BS Environmental Science Sustainability Science and Policy",
  "BS Environmental and Sustainable Engineering",
  "BS Environmental and Sustainable Engineering Alternate",
  "BS Financial Market Regulation",
  "BS Game Design and Development AI and Game Design and Development Concentration",
  "BS Game Design and Development Design and Animation Concentration",
  "BS Game Design and Development Emerging Technologies in Games Concentration",
  "BS Game Design and Development Game Programming Concentration",
  "BS Game Design and Development Innovative Narrative for Game Design Concentration",
  "BS Game Design and Development Music Technology Concentration",
  "BS Game Design and Development Networking and Security Concentration",
  "BS Game Design and Development Simulation and Serious Games Concentration",
  "BS Human Biology",
  "BS Human Biology Pre-Health",
  "BS Human Development Counseling Psychology Concentration",
  "BS Human Development Higher Education Concentration",
  "BS Human Development Peer Assistance and Leadership Concentration",
  "BS Human Development Psychological Studies of Learning and Development Concentration",
  "BS Human Development Special Education Concentration",
  "BS Informatics Artificial Intelligence Machine Learning Concentration",
  "BS Informatics Data Analytics Concentration",
  "BS Informatics Game Design & Development Concentration",
  "BS Informatics Health Informatics Concentration",
  "BS Informatics Information Technology Concentration",
  "BS Informatics Interactive User Experience Concentration",
  "BS Informatics Library and Information Science Concentration",
  "BS Informatics Social Media Concentration",
  "BS Informatics Software Development Concentration",
  "BS Legal Studies",
  "BS Mathematics",
  "BS Nanoscale Engineering",
  "BS Nanoscale Science",
  "BS Nursing 1-2-1",
  "BS Nursing",
  "BS Nursing Completion Full-Time",
  "BS Nursing Completion Part-Time",
  "BS Physics",
  "BS Physics Astronomy and Particle Astrophysics Track",
  "BS Physics Bio-Imaging Track",
  "BS Physics Computational Physics Track",
  "BS Public Health",
  "BS Quantitative Economics and Data Analysis",
  "BS Social Welfare Matriculated Students Before Fall 2018",
  "BS Social Welfare Matriculated Students Starting Fall 2018",
  "Pre-Health",
];

const majorDisplayOverrides: Record<string, string> = {
  "BA English Writing Concentration": "English - Writing Concentration (B.A.)",
  "BS Adolescent Education Spanish (Heritage Speaker)":
    "Adolescent Education Spanish (Heritage Speaker) (B.S.)",
  "BS Adolescent Education Spanish (Non-Heritage Speaker)":
    "Adolescent Education Spanish (Non-Heritage Speaker) (B.S.)",
  "BS Chemistry Chemical Biological": "Chemistry - Chemical Biology (B.S.)",
  "BS Early Childhood Childhood Education": "Early Childhood / Childhood Education (B.S.)",
  "BS Game Design and Development AI and Game Design and Development Concentration":
    "Game Design and Development - AI and Game Design Concentration (B.S.)",
  "BS Informatics Artificial Intelligence Machine Learning Concentration":
    "Informatics - Artificial Intelligence / Machine Learning Concentration (B.S.)",
  "Pre-Health": "Pre-Health",
};

const majorDisplayPrefixes = [
  "Computer Science & Applied Mathematics (CSMAT)",
  "Emergency Preparedness, Homeland Security and Cybersecurity",
  "Environmental and Sustainable Engineering",
  "Electrical and Computer Engineering",
  "Game Design and Development",
  "Adolescent Education Spanish",
  "East Asian Studies",
  "Environmental Studies",
  "Environmental Science",
  "Human Development",
  "Human Biology",
  "Cybersecurity",
  "Informatics",
  "Chemistry",
  "Spanish",
  "Physics",
  "Nursing",
  "Social Welfare",
].sort((left, right) => right.length - left.length);

function formatMajorName(rawMajor: string) {
  const override = majorDisplayOverrides[rawMajor];
  if (override) {
    return override;
  }

  const [degreePrefix, ...bodyParts] = rawMajor.split(" ");
  if (degreePrefix !== "BA" && degreePrefix !== "BS") {
    return rawMajor;
  }

  const degreeLabel = degreePrefix === "BA" ? "(B.A.)" : "(B.S.)";
  const body = bodyParts.join(" ").trim();

  for (const prefix of majorDisplayPrefixes) {
    if (body === prefix) {
      return `${prefix} ${degreeLabel}`;
    }

    if (body.startsWith(`${prefix} `)) {
      const detail = body.slice(prefix.length + 1).trim();
      return `${prefix} - ${detail} ${degreeLabel}`;
    }
  }

  return `${body} ${degreeLabel}`;
}

const majorNameAliases: Record<string, string> = {
  "Computer Science": "Computer Science (B.S.)",
  "Mathematics": "Mathematics (B.S.)",
  "Physics": "Physics (B.S.)",
  "Chemistry": "Chemistry (B.S.)",
  "Biology": "Biology (B.S.)",
  "Economics": "Economics (B.A.)",
  "Psychology": "Psychology (B.A.)",
  "History": "History (B.A.)",
  "Accounting": "Accounting (B.A.)",
  "Art": "Art (B.S.)",
  "Music": "Music (B.A.)",
  "English": "English (B.A.)",
  "Philosophy": "Philosophy (B.A.)",
  "Political Science": "Political Science (B.A.)",
  "Sociology": "Sociology (B.A.)",
  "Anthropology": "Anthropology (B.A.)",
  "Information Science": "Informatics - Information Technology Concentration (B.S.)",
  "Computer Engineering": "Electrical and Computer Engineering (B.S.)",
  "Business": "Business Administration (B.S.)",
};

export function normalizeMajorName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (majorNameAliases[trimmed]) {
    return majorNameAliases[trimmed];
  }

  if (rawAvailableMajors.includes(trimmed)) {
    return formatMajorName(trimmed);
  }

  return trimmed;
}

export const availableMajors = rawAvailableMajors.map((major) => formatMajorName(major));

const formattedMajorToRawMajor = new Map(
  rawAvailableMajors.map((major) => [formatMajorName(major), major]),
);

function resolveFourYearPlanRawMajor(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (fourYearPlanCoursesByRawMajor[trimmed]) {
    return trimmed;
  }

  const normalizedMajor = normalizeMajorName(trimmed);
  const rawMajor = formattedMajorToRawMajor.get(normalizedMajor);
  if (rawMajor && fourYearPlanCoursesByRawMajor[rawMajor]) {
    return rawMajor;
  }

  return "";
}

export const allCourses: Course[] = [
  {
    id: "ICSI105",
    code: "I CSI 105",
    title: "Computing and Information",
    dept: "CS",
    credits: 3,
    desc: "A broad introduction to computing, digital systems, and information workflows.",
    prereqs: [],
  },
  {
    id: "ICSI107",
    code: "I CSI 107",
    title: "Web Programming",
    dept: "CS",
    credits: 3,
    desc: "Foundations of web development with HTML, CSS, JavaScript, and interactive applications.",
    prereqs: [],
  },
  {
    id: "ICSI201",
    code: "I CSI 201",
    title: "Introduction to Computer Science",
    dept: "CS",
    credits: 4,
    desc: "Computer science overview: algorithms, data representation, boolean algebra, digital logic design, assembly language, and compiler translations.",
    prereqs: [],
  },
  {
    id: "ICSI210",
    code: "I CSI 210",
    title: "Discrete Structures",
    dept: "CS",
    credits: 4,
    desc: "Mathematical reasoning, sets, relations, functions, graphs, trees, counting, and probability.",
    prereqs: [],
  },
  {
    id: "ICSI213",
    code: "I CSI 213",
    title: "Data Structures",
    dept: "CS",
    credits: 4,
    desc: "Stacks, queues, linked lists, trees, graphs, hashing, sorting, and searching.",
    prereqs: ["ICSI201"],
  },
  {
    id: "ICSI300Z",
    code: "I CSI 300Z",
    title: "Societal and Ethical Implications of Computing",
    dept: "CS",
    credits: 3,
    desc: "Ethics, policy, equity, and public impact of computing systems and software decisions.",
    prereqs: [],
  },
  {
    id: "ICSI311",
    code: "I CSI 311",
    title: "Principles of Programming Languages",
    dept: "CS",
    credits: 4,
    desc: "Concepts of syntax, semantics, type systems, interpreters, and programming paradigms.",
    prereqs: ["ICSI210", "ICSI213"],
  },
  {
    id: "ICSI333",
    code: "I CSI 333",
    title: "System Fundamentals",
    dept: "CS",
    credits: 4,
    desc: "Introduction to computer organization, assembly language programming, and operating systems.",
    prereqs: ["ICSI213"],
  },
  {
    id: "ICSI401",
    code: "I CSI 401",
    title: "Numerical Methods",
    dept: "CS",
    credits: 3,
    desc: "Applied numerical computation, approximation techniques, and scientific computing workflows.",
    prereqs: ["AMAT112"],
  },
  {
    id: "ICSI402",
    code: "I CSI 402",
    title: "Systems Programming",
    dept: "CS",
    credits: 3,
    desc: "Programming close to the operating system with processes, files, and low-level memory control.",
    prereqs: ["ICSI333"],
  },
  {
    id: "ICSI403",
    code: "I CSI 403",
    title: "Design and Analysis of Algorithms",
    dept: "CS",
    credits: 3,
    desc: "Algorithm design paradigms, proofs of correctness, complexity analysis, and optimization tradeoffs.",
    prereqs: ["ICSI210", "ICSI213"],
  },
  {
    id: "ICSI404",
    code: "I CSI 404",
    title: "Computer Architecture and Organization",
    dept: "CS",
    credits: 3,
    desc: "Processor architecture, pipelines, memory hierarchy, and system-level hardware organization.",
    prereqs: ["ICSI333"],
  },
  {
    id: "ICSI410",
    code: "I CSI 410",
    title: "Database Systems",
    dept: "CS",
    credits: 3,
    desc: "Relational models, SQL, schema design, normalization, and transaction processing.",
    prereqs: ["ICSI210", "ICSI213"],
  },
  {
    id: "ICSI412",
    code: "I CSI 412",
    title: "Operating Systems",
    dept: "CS",
    credits: 3,
    desc: "Concurrency, scheduling, memory management, virtualization, and operating system design.",
    prereqs: ["ICSI333"],
  },
  {
    id: "ICSI418Y",
    code: "I CSI 418Y",
    title: "Software Engineering",
    dept: "CS",
    credits: 4,
    desc: "Software life cycle, requirements analysis, design, implementation, testing, and maintenance.",
    prereqs: ["ICSI311"],
  },
  {
    id: "ICSI422",
    code: "I CSI 422",
    title: "Computer Security",
    dept: "CS",
    credits: 3,
    desc: "Threat models, secure design, authentication, cryptography basics, and software vulnerabilities.",
    prereqs: ["ICSI333"],
  },
  {
    id: "ICSI424",
    code: "I CSI 424",
    title: "Information Security",
    dept: "CS",
    credits: 3,
    desc: "Defensive strategies for information systems, networks, privacy, and risk management.",
    prereqs: ["ICSI333"],
  },
  {
    id: "ICSI426",
    code: "I CSI 426",
    title: "Cryptography",
    dept: "CS",
    credits: 3,
    desc: "Symmetric and public-key cryptography, protocols, and secure communication models.",
    prereqs: ["ICSI210"],
  },
  {
    id: "ICSI431",
    code: "I CSI 431",
    title: "Data Mining",
    dept: "CS",
    credits: 3,
    desc: "Pattern discovery, classification, clustering, and applied analysis of large data sets.",
    prereqs: ["ICSI311"],
  },
  {
    id: "ICSI435",
    code: "I CSI 435",
    title: "Artificial Intelligence",
    dept: "CS",
    credits: 3,
    desc: "Problem solving, search, knowledge representation, and intelligent agent design.",
    prereqs: ["ICSI210", "ICSI213"],
  },
  {
    id: "ICSI436",
    code: "I CSI 436",
    title: "Machine Learning",
    dept: "CS",
    credits: 3,
    desc: "Supervised and unsupervised learning, model evaluation, and practical ML pipelines.",
    prereqs: ["ICSI210", "ICSI213"],
  },
  {
    id: "AMAT100",
    code: "A MAT 100",
    title: "Mathematics in Society",
    dept: "Math",
    credits: 3,
    desc: "Quantitative reasoning and mathematical literacy in social and civic contexts.",
    prereqs: [],
  },
  {
    id: "AMAT108",
    code: "A MAT 108",
    title: "Algebra for College Success",
    dept: "Math",
    credits: 3,
    desc: "Algebraic modeling, functions, and symbolic reasoning for college-level problem solving.",
    prereqs: [],
  },
  {
    id: "AMAT112",
    code: "A MAT 112",
    title: "Calculus I",
    dept: "Math",
    credits: 4,
    desc: "Limits, continuity, differentiation, applications of the derivative, integration, and the fundamental theorem of calculus.",
    prereqs: [],
  },
  {
    id: "AMAT113",
    code: "A MAT 113",
    title: "Calculus II",
    dept: "Math",
    credits: 4,
    desc: "Integration techniques, sequences and series, parametric equations, and polar coordinates.",
    prereqs: ["AMAT112"],
  },
  {
    id: "AMAT214",
    code: "A MAT 214",
    title: "Calculus of Several Variables",
    dept: "Math",
    credits: 4,
    desc: "Multivariable differentiation and integration with applications to geometry and physics.",
    prereqs: ["AMAT113"],
  },
  {
    id: "AMAT220",
    code: "A MAT 220",
    title: "Linear Algebra",
    dept: "Math",
    credits: 3,
    desc: "Matrices, vector spaces, linear transformations, eigenvalues, and systems of equations.",
    prereqs: ["AMAT112"],
  },
  {
    id: "AMAT299",
    code: "A MAT 299",
    title: "Introduction to Proofs",
    dept: "Math",
    credits: 3,
    desc: "Logic, proof techniques, sets, and rigorous mathematical writing.",
    prereqs: ["AMAT112"],
  },
  {
    id: "APHY105",
    code: "A PHY 105",
    title: "Physical Science Foundations",
    dept: "Physics",
    credits: 3,
    desc: "Introductory physical science for general education with lab-style reasoning.",
    prereqs: [],
  },
  {
    id: "APHY140",
    code: "A PHY 140",
    title: "Physics I: Mechanics",
    dept: "Physics",
    credits: 3,
    desc: "An introduction to mechanics, forces, energy, and momentum.",
    prereqs: ["AMAT112"],
  },
  {
    id: "ABIO110",
    code: "A BIO 110",
    title: "Foundations of Biology",
    dept: "Biology",
    credits: 3,
    desc: "Cell structure, genetics, evolution, and scientific reasoning in biology.",
    prereqs: [],
  },
  {
    id: "ABIO120",
    code: "A BIO 120",
    title: "General Biology I",
    dept: "Biology",
    credits: 3,
    desc: "Survey of biological principles with emphasis on organismal and cellular systems.",
    prereqs: [],
  },
  {
    id: "ACHM120",
    code: "A CHM 120",
    title: "General Chemistry I",
    dept: "Chemistry",
    credits: 3,
    desc: "Atomic structure, bonding, stoichiometry, thermochemistry, and laboratory thinking.",
    prereqs: [],
  },
  {
    id: "APSY101",
    code: "A PSY 101",
    title: "Introduction to Psychology",
    dept: "Psychology",
    credits: 3,
    desc: "Survey of the scientific study of behavior and mental processes.",
    prereqs: [],
  },
  {
    id: "ASOC115",
    code: "A SOC 115",
    title: "Introduction to Sociology",
    dept: "Sociology",
    credits: 3,
    desc: "Social structures, institutions, identity, and methods for studying society.",
    prereqs: [],
  },
  {
    id: "AECO110",
    code: "A ECO 110",
    title: "Principles of Economics I: Microeconomics",
    dept: "Economics",
    credits: 3,
    desc: "Markets, incentives, consumer choice, firms, and welfare analysis.",
    prereqs: [],
  },
  {
    id: "AHIS100",
    code: "A HIS 100",
    title: "American Political and Social History I",
    dept: "History",
    credits: 3,
    desc: "Historical perspectives on the political, social, and civic development of the United States.",
    prereqs: [],
  },
  {
    id: "AENG110",
    code: "A ENG 110",
    title: "Introduction to Analytical Writing",
    dept: "English",
    credits: 3,
    desc: "Writing-intensive practice in argument, analysis, revision, and academic communication.",
    prereqs: [],
  },
  {
    id: "UUNI110",
    code: "U UNI 110",
    title: "The First-Year Experience",
    dept: "University",
    credits: 3,
    desc: "Transition course focused on inquiry, reflection, and academic success strategies.",
    prereqs: [],
  },
  {
    id: "AARH170",
    code: "A ARH 170",
    title: "Survey of Art in the Western World I",
    dept: "Art",
    credits: 3,
    desc: "Historical survey of visual culture, artistic movements, and critical interpretation.",
    prereqs: [],
  },
  {
    id: "AMUS100",
    code: "A MUS 100",
    title: "Introduction to Music",
    dept: "Music",
    credits: 3,
    desc: "Basic concepts of music theory, listening, and historical context.",
    prereqs: [],
  },
  {
    id: "APHI110",
    code: "A PHI 110",
    title: "Introduction to Philosophical Problems",
    dept: "Philosophy",
    credits: 3,
    desc: "Major questions in ethics, knowledge, personhood, and philosophical reasoning.",
    prereqs: [],
  },
  {
    id: "AGOG102",
    code: "A GOG 102",
    title: "Human Geography",
    dept: "Geography",
    credits: 3,
    desc: "Global patterns of culture, place, population, and human-environment systems.",
    prereqs: [],
  },
  {
    id: "ALCS100",
    code: "A LCS 100",
    title: "World Literatures and Cultures",
    dept: "Languages",
    credits: 3,
    desc: "Cross-cultural study of literature and global perspectives on identity and society.",
    prereqs: [],
  },
  {
    id: "AAAS219",
    code: "A AAS 219",
    title: "African American Studies",
    dept: "AAS",
    credits: 3,
    desc: "Interdisciplinary analysis of African American history, politics, and culture.",
    prereqs: [],
  },
  {
    id: "AWSS101",
    code: "A WSS 101",
    title: "Introduction to Women's, Gender and Sexuality Studies",
    dept: "WGS",
    credits: 3,
    desc: "Foundations of gender, sexuality, power, representation, and social change.",
    prereqs: [],
  },
];

export const courseMap = new Map(allCourses.map((course) => [course.id, course]));

export const csDegree = {
  name: "Computer Science B.S.",
  totalCredits: 120,
  requirements: [
    {
      id: "core",
      label: "Core (all)",
      need: 6,
      courses: ["ICSI201", "ICSI210", "ICSI213", "ICSI311", "ICSI333", "ICSI403"],
    },
    {
      id: "software",
      label: "Software Engineering",
      need: 1,
      courses: ["ICSI418Y"],
    },
    {
      id: "systems",
      label: "Systems (choose 1)",
      need: 1,
      courses: ["ICSI404", "ICSI412"],
    },
    {
      id: "data",
      label: "Data / DB (choose 1)",
      need: 1,
      courses: ["ICSI410", "ICSI431"],
    },
    {
      id: "ai",
      label: "AI / ML (choose 1)",
      need: 1,
      courses: ["ICSI435", "ICSI436"],
    },
    {
      id: "ethics",
      label: "Ethics",
      need: 1,
      courses: ["ICSI300Z"],
    },
  ] satisfies RequirementBucket[],
};

export const genEdCategories: GenEdCategory[] = [
  {
    code: "MS",
    label: "Mathematics and Quantitative Reasoning",
    options: ["AMAT100", "AMAT108", "AMAT112", "AMAT113"],
  },
  {
    code: "WCI",
    label: "Writing and Critical Inquiry",
    options: ["UUNI110", "AENG110"],
  },
  {
    code: "AR",
    label: "Arts",
    options: ["AARH170", "AMUS100"],
  },
  {
    code: "HU",
    label: "Humanities",
    options: ["AENG110", "APHI110", "AHIS100"],
  },
  {
    code: "NS",
    label: "Natural Sciences and Scientific Reasoning",
    options: ["APHY105", "ABIO110", "ACHM120"],
  },
  {
    code: "SS",
    label: "Social Sciences",
    options: ["APSY101", "ASOC115", "AECO110"],
  },
  {
    code: "US",
    label: "U.S. History and Civic Engagement",
    options: ["AHIS100"],
  },
  {
    code: "IP",
    label: "World History and International Perspectives",
    options: ["AGOG102", "ALCS100"],
  },
  {
    code: "DEISJ",
    label: "Diversity: Equity, Inclusion & Social Justice",
    options: ["AAAS219", "AWSS101"],
  },
];

export function getCourseById(id: string) {
  return courseMap.get(id) ?? null;
}

export function getCourseBySlug(slug: string) {
  const normalized = normalizeCourseId(slug);
  return getCourseById(normalized);
}

export function toCourseSlug(id: string) {
  return normalizeCourseId(id).toLowerCase();
}

export function normalizeCourseId(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

const fourYearPlanCourseCodeById = new Map(
  Object.values(fourYearPlanCoursesByRawMajor)
    .flat()
    .map((code) => [normalizeCourseId(code), code] as const),
);

export function getFourYearPlanCourseCodesForMajor(majorName: string) {
  const rawMajor = resolveFourYearPlanRawMajor(majorName);
  return rawMajor ? (fourYearPlanCoursesByRawMajor[rawMajor] ?? []) : [];
}

export function getFourYearPlanCourseIdsForMajor(majorName: string) {
  return getFourYearPlanCourseCodesForMajor(majorName).map((code) => normalizeCourseId(code));
}

export function getFourYearPlanCourseCodeById(courseId: string) {
  return fourYearPlanCourseCodeById.get(normalizeCourseId(courseId)) ?? null;
}

export function inferDepartmentFromCode(code: string) {
  const compact = normalizeCourseId(code);
  if (compact.startsWith("ICSI")) {
    return "CS";
  }
  if (compact.startsWith("AMAT")) {
    return "Math";
  }
  if (compact.startsWith("APHY")) {
    return "Physics";
  }
  if (compact.startsWith("ABIO")) {
    return "Biology";
  }
  if (compact.startsWith("ACHM")) {
    return "Chemistry";
  }
  return "Course";
}

export function mapCourseRecord(record: Record<string, unknown>) {
  const code = buildCourseCode(record);

  if (!code) {
    return null;
  }

  const title =
    readTextField(record, [
      "title",
      "name",
      "course_title",
      "courseTitle",
      "long_title",
      "longTitle",
      "course_name",
      "courseName",
    ]) ||
    "Untitled Course";

  const dept =
    readTextField(record, ["department", "dept", "subject", "college"]) ||
    inferDepartmentFromCode(code);

  const description =
    readTextField(record, [
      "desc",
      "description",
      "course_description",
      "courseDescription",
      "summary",
    ]) || "No description available for this course in the database.";

  return {
    id: normalizeCourseId(code),
    code,
    title,
    dept,
    credits: readNumberField(record, ["credits", "credit", "units"]) || 3,
    desc: description,
    prereqs: readPrereqField(record),
  } satisfies Course;
}

export function courseLabel(id: string) {
  const course = getCourseById(id);
  if (!course) {
    return id;
  }

  return `${course.code} ${course.title}`;
}

export function prereqLine(id: string) {
  const course = getCourseById(id);
  if (!course || course.prereqs.length === 0) {
    return "No prerequisites";
  }

  return `Prereq: ${course.prereqs.map((code) => getCourseById(code)?.code ?? code).join(", ")}`;
}

export function creditsFor(id: string) {
  return getCourseById(id)?.credits ?? 3;
}

export function searchCourses(query: string, coursePool: Course[] = allCourses) {
  const rawTerm = query.toLowerCase().trim();
  const cleanTerm = rawTerm.replace(/[^a-z0-9]/g, "");

  if (!rawTerm) {
    return [];
  }

  return coursePool
    .map((course) => {
      let score = 0;
      const codeLower = course.code.toLowerCase();
      const codeClean = codeLower.replace(/[^a-z0-9]/g, "");
      const idClean = course.id.toLowerCase().replace(/[^a-z0-9]/g, "");
      const titleLower = course.title.toLowerCase();
      const deptLower = course.dept.toLowerCase();
      const deptClean = deptLower.replace(/[^a-z0-9]/g, "");

      if (cleanTerm && (codeClean.includes(cleanTerm) || idClean.includes(cleanTerm))) {
        score += 10;
        if (codeClean.startsWith(cleanTerm) || idClean.startsWith(cleanTerm)) {
          score += 20;
        }
        if (codeClean === cleanTerm || idClean === cleanTerm) {
          score += 50;
        }
      }

      if (codeLower.includes(rawTerm) || titleLower.includes(rawTerm)) {
        score += 5;
        if (titleLower.startsWith(rawTerm)) {
          score += 10;
        }
      }

      if ((rawTerm && deptLower.includes(rawTerm)) || (cleanTerm && deptClean.includes(cleanTerm))) {
        score += 3;
      }

      return { course, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.course);
}

export function uniqueCourseIds(courseIds: string[]) {
  return [...new Set(courseIds)];
}

export const majorCourseIds = uniqueCourseIds(
  csDegree.requirements.flatMap((requirement) => requirement.courses),
);
