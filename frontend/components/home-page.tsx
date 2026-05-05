"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  allCourses,
  searchCourses,
  toCourseSlug,
  type Course,
} from "@/shared/site-data";
import { loadCoursesFromBackend, searchCoursesFromBackend } from "@/frontend/lib/course-api";
import {
  useInactivityLogout,
  useProfileSession,
} from "@/frontend/lib/session";

type SceneLabel = {
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  depth: number;
  phase: number;
};

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

type AccentCourse = {
  code: string;
  title: string;
  xRatio: number;
  yRatio: number;
  align: CanvasTextAlign;
  hue: "blue" | "gold";
};

const SCENE_LABELS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Psychology",
  "Economics",
  "History",
  "Engineering",
  "Data Science",
];
const PHI = (1 + Math.sqrt(5)) / 2;
const OUTER_VERTICES: Vec3[] = [
  { x: -1, y: PHI, z: 0 },
  { x: 1, y: PHI, z: 0 },
  { x: -1, y: -PHI, z: 0 },
  { x: 1, y: -PHI, z: 0 },
  { x: 0, y: -1, z: PHI },
  { x: 0, y: 1, z: PHI },
  { x: 0, y: -1, z: -PHI },
  { x: 0, y: 1, z: -PHI },
  { x: PHI, y: 0, z: -1 },
  { x: PHI, y: 0, z: 1 },
  { x: -PHI, y: 0, z: -1 },
  { x: -PHI, y: 0, z: 1 },
];
const INNER_VERTICES: Vec3[] = OUTER_VERTICES.map((vertex) => ({
  x: vertex.x * 0.52,
  y: vertex.y * 0.52,
  z: vertex.z * 0.52,
}));
const ACCENT_COURSES: AccentCourse[] = [
  {
    code: "I CSI 418Y",
    title: "Software Engineering",
    xRatio: 0.16,
    yRatio: 0.33,
    align: "left",
    hue: "blue",
  },
  {
    code: "A MAT 220",
    title: "Linear Algebra",
    xRatio: 0.84,
    yRatio: 0.67,
    align: "right",
    hue: "gold",
  },
];

function buildEdges(vertices: Vec3[]) {
  const edges: Array<[number, number]> = [];
  const distances: number[] = [];

  for (let left = 0; left < vertices.length; left += 1) {
    for (let right = left + 1; right < vertices.length; right += 1) {
      const dx = vertices[left].x - vertices[right].x;
      const dy = vertices[left].y - vertices[right].y;
      const dz = vertices[left].z - vertices[right].z;
      distances.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
    }
  }

  const edgeDistance = Math.min(...distances);
  const threshold = edgeDistance + 0.001;

  for (let left = 0; left < vertices.length; left += 1) {
    for (let right = left + 1; right < vertices.length; right += 1) {
      const dx = vertices[left].x - vertices[right].x;
      const dy = vertices[left].y - vertices[right].y;
      const dz = vertices[left].z - vertices[right].z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance <= threshold) {
        edges.push([left, right]);
      }
    }
  }

  return edges;
}

const OUTER_EDGES = buildEdges(OUTER_VERTICES);
const INNER_EDGES = buildEdges(INNER_VERTICES);

function rotateVertex(vertex: Vec3, rotationX: number, rotationY: number) {
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);

  const y = vertex.y * cosX - vertex.z * sinX;
  const zAfterX = vertex.y * sinX + vertex.z * cosX;
  const x = vertex.x * cosY + zAfterX * sinY;
  const z = -vertex.x * sinY + zAfterX * cosY;

  return { x, y, z };
}

function projectVertex(vertex: Vec3, width: number, height: number, scale: number) {
  const depth = 4.8 / (4.8 - vertex.z);
  return {
    x: width / 2 + vertex.x * scale * depth,
    y: height / 2 + vertex.y * scale * depth,
    depth,
  };
}

function buildSceneLabels(width: number, height: number) {
  const labels: SceneLabel[] = [];
  const targetCount = Math.min(34, Math.max(18, Math.round((width * height) / 48000)));
  const centerBlock = {
    left: width * 0.22,
    right: width * 0.78,
    top: height * 0.26,
    bottom: height * 0.72,
  };
  const navBlock = {
    left: width - 240,
    right: width - 12,
    top: 0,
    bottom: 120,
  };

  while (labels.length < targetCount) {
    const text = SCENE_LABELS[labels.length % SCENE_LABELS.length];
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 80) {
      const x = 40 + Math.random() * Math.max(80, width - 80);
      const y = 40 + Math.random() * Math.max(80, height - 80);
      const insideCenter =
        x > centerBlock.left && x < centerBlock.right && y > centerBlock.top && y < centerBlock.bottom;
      const insideNav =
        x > navBlock.left && x < navBlock.right && y > navBlock.top && y < navBlock.bottom;
      const tooClose = labels.some((label) => {
        const dx = label.x - x;
        const dy = label.y - y;
        return Math.sqrt(dx * dx + dy * dy) < 96;
      });

      if (!insideCenter && !insideNav && !tooClose) {
        labels.push({
          text,
          x,
          y,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.14,
          size: 12 + Math.random() * 12,
          depth: 0.45 + Math.random() * 0.65,
          phase: Math.random() * Math.PI * 2,
        });
        placed = true;
      }

      attempts += 1;
    }

    if (!placed) {
      labels.push({
        text,
        x: 60 + Math.random() * Math.max(80, width - 120),
        y: 60 + Math.random() * Math.max(80, height - 120),
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.1,
        size: 12 + Math.random() * 10,
        depth: 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  return labels;
}

function HomeSceneBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let labels: SceneLabel[] = [];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      labels = buildSceneLabels(width, height);
    };

    const drawBackground = () => {
      const fill = context.createLinearGradient(0, 0, width, height);
      fill.addColorStop(0, "#f7f8fa");
      fill.addColorStop(1, "#edf1f6");
      context.fillStyle = fill;
      context.fillRect(0, 0, width, height);

      const aura = context.createRadialGradient(
        width * 0.5,
        height * 0.48,
        Math.min(width, height) * 0.04,
        width * 0.5,
        height * 0.48,
        Math.min(width, height) * 0.52,
      );
      aura.addColorStop(0, "rgba(0, 122, 255, 0.12)");
      aura.addColorStop(0.55, "rgba(0, 122, 255, 0.04)");
      aura.addColorStop(1, "rgba(0, 122, 255, 0)");
      context.fillStyle = aura;
      context.fillRect(0, 0, width, height);

      const warmGlow = context.createRadialGradient(
        width * 0.5,
        height * 0.5,
        0,
        width * 0.5,
        height * 0.5,
        Math.min(width, height) * 0.16,
      );
      warmGlow.addColorStop(0, "rgba(255, 149, 0, 0.12)");
      warmGlow.addColorStop(1, "rgba(255, 149, 0, 0)");
      context.fillStyle = warmGlow;
      context.fillRect(0, 0, width, height);
    };

    const drawLabels = (time: number) => {
      for (const label of labels) {
        label.x += label.vx * label.depth;
        label.y += label.vy * label.depth;

        if (label.x < -100) {
          label.x = width + 100;
        } else if (label.x > width + 100) {
          label.x = -100;
        }

        if (label.y < -60) {
          label.y = height + 60;
        } else if (label.y > height + 60) {
          label.y = -60;
        }

        const alpha = 0.08 + label.depth * 0.12 + Math.sin(time * 0.00055 + label.phase) * 0.03;
        context.font = `700 ${label.size}px "Sora", "Avenir Next", "Helvetica Neue", sans-serif`;
        context.fillStyle = `rgba(0, 122, 255, ${alpha})`;
        context.fillText(label.text, label.x, label.y);
      }
    };

    const drawAccentCourses = (time: number) => {
      for (const course of ACCENT_COURSES) {
        const x = width * course.xRatio;
        const y = height * course.yRatio;
        const drift = Math.sin(time * 0.0007 + x * 0.001) * 6;
        const primaryColor =
          course.hue === "blue"
            ? "rgba(0, 122, 255, 0.16)"
            : "rgba(255, 149, 0, 0.16)";
        const secondaryColor =
          course.hue === "blue"
            ? "rgba(0, 122, 255, 0.1)"
            : "rgba(255, 149, 0, 0.1)";

        context.save();
        context.textAlign = course.align;
        context.shadowBlur = 20;
        context.shadowColor = primaryColor;
        context.font = `700 ${Math.max(22, width * 0.022)}px "Sora", "Avenir Next", "Helvetica Neue", sans-serif`;
        context.fillStyle = primaryColor;
        context.fillText(course.code, x, y + drift);
        context.font = `600 ${Math.max(14, width * 0.012)}px "Sora", "Avenir Next", "Helvetica Neue", sans-serif`;
        context.fillStyle = secondaryColor;
        context.fillText(course.title, x, y + drift + 26);
        context.restore();
      }
    };

    const drawArtifact = (vertices: Vec3[], edges: Array<[number, number]>, time: number, color: string) => {
      const rotationX = time * 0.00035;
      const rotationY = time * 0.0006;
      const scale = Math.min(width, height) * 0.16;
      const projected = vertices.map((vertex) =>
        projectVertex(rotateVertex(vertex, rotationX, rotationY), width, height, scale),
      );

      context.beginPath();
      for (const [start, end] of edges) {
        context.moveTo(projected[start].x, projected[start].y);
        context.lineTo(projected[end].x, projected[end].y);
      }
      context.strokeStyle = color;
      context.lineWidth = 1.2;
      context.stroke();
    };

    const drawScene = (time: number) => {
      drawBackground();
      drawLabels(time);
      drawAccentCourses(time);

      context.save();
      context.shadowBlur = 28;
      context.shadowColor = "rgba(0, 122, 255, 0.18)";
      drawArtifact(OUTER_VERTICES, OUTER_EDGES, time, "rgba(0, 122, 255, 0.26)");
      context.restore();

      context.save();
      context.shadowBlur = 24;
      context.shadowColor = "rgba(255, 149, 0, 0.18)";
      drawArtifact(INNER_VERTICES, INNER_EDGES, -time * 1.4, "rgba(255, 149, 0, 0.36)");
      context.restore();

      const pulse = 10 + Math.sin(time * 0.0025) * 2;
      context.beginPath();
      context.arc(width / 2, height / 2, pulse, 0, Math.PI * 2);
      context.fillStyle = "rgba(255, 149, 0, 0.14)";
      context.fill();

      animationFrame = window.requestAnimationFrame(drawScene);
    };

    resize();
    animationFrame = window.requestAnimationFrame(drawScene);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="home-scene" aria-hidden="true">
      <canvas ref={canvasRef} className="home-scene-canvas" />
      <div className="home-scene-fade" />
    </div>
  );
}

export function HomePage() {
  const [profile] = useProfileSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [coursePool, setCoursePool] = useState<Course[]>(allCourses);
  const [remoteSearchResults, setRemoteSearchResults] = useState<Course[] | null>(null);
  const [remoteSearchError, setRemoteSearchError] = useState<string | null>(null);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [sourceLabel, setSourceLabel] = useState("Connecting to SQL Database...");
  const isLoggedIn = Boolean(profile.firstName);
  const isAdvisor = profile.role === "advisor";

  useInactivityLogout(isLoggedIn);

  useEffect(() => {
    let active = true;

    const fetchCourses = async () => {
      setIsLoadingCourses(true);
      const { courses, error } = await loadCoursesFromBackend();
      if (!active) {
        return;
      }

      if (error || courses.length === 0) {
        setCoursePool(allCourses);
        setSourceLabel(error ? `Local Catalog Fallback: ${error}` : "Local Catalog Fallback");
      } else {
        setCoursePool(courses);
        setSourceLabel(`SQL Catalog Loaded: ${courses.length} courses`);
      }

      setIsLoadingCourses(false);
    };

    void fetchCourses();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) {
      setRemoteSearchResults(null);
      setRemoteSearchError(null);
      return;
    }

    let active = true;
    const runRemoteSearch = async () => {
      const { courses, error } = await searchCoursesFromBackend(term, 120);
      if (!active) {
        return;
      }

      if (error) {
        setRemoteSearchResults(null);
        setRemoteSearchError(error);
        return;
      }

      setRemoteSearchResults(courses);
      setRemoteSearchError(null);
    };

    void runRemoteSearch();

    return () => {
      active = false;
    };
  }, [searchTerm]);

  const localResults = searchCourses(searchTerm, coursePool);
  const rawResults = remoteSearchError
    ? localResults
    : (remoteSearchResults ?? localResults);
  const results = rawResults.slice(0, 50);
  return (
    <div className="home-shell min-h-screen">
      <HomeSceneBackground />

      <div className="top-nav">
        <Link href={isLoggedIn ? (isAdvisor ? "/advisor" : "/course_select") : "/login"} className="nav-link">
          Planner
        </Link>
        <Link href={isLoggedIn ? "/profile" : "/login"} className="nav-link">
          {isLoggedIn ? "Profile" : "Sign In"}
        </Link>
      </div>

      <main className="search-page">
        <div className="search-heading">Degree Audit and Academic Planning System</div>

        <div className="search-wrapper anim-fade-in" style={{ animationDelay: "0.1s" }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={
              isLoadingCourses
                ? "Connecting to SQL Database..."
                : "Search courses, professors, or departments..."
            }
            className="search-box-large"
          />
          <div className="search-status">{sourceLabel}</div>

          {searchTerm.trim() ? (
            <ul className="results-dropdown active">
              {rawResults.length > 0 ? (
                <li className="results-summary">
                  Showing {results.length} of {rawResults.length} matching courses
                </li>
              ) : null}
              {results.length > 0 ? (
                results.map((course) => (
                  <li key={course.id} className="course-item">
                    <Link href={`/course_detail/${toCourseSlug(course.id)}`} className="course-item-link">
                      <div>
                        <span className="course-code">{course.code}</span>
                        <span className="course-title">{course.title}</span>
                      </div>
                      <span className="course-dept">{course.dept}</span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="results-empty">NO_MATCH_FOUND</li>
              )}
            </ul>
          ) : null}
        </div>
      </main>
    </div>
  );
}
