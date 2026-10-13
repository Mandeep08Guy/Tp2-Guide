import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, ExploringMode, OnlineMediaItem, ProTip } from "../types";

const RAW_KEYS = [
  import.meta.env.VITE_GEMINI_API_KEY,
  import.meta.env.GEMINI_API_KEY,
  import.meta.env.VITE_GEMINI_API_KEY_1,
  import.meta.env.VITE_GEMINI_API_KEY_2,
  import.meta.env.VITE_GEMINI_API_KEY_3,
  import.meta.env.VITE_GEMINI_API_KEY_4,
  import.meta.env.VITE_GEMINI_API_KEY_5,
  import.meta.env.VITE_GEMINI_API_KEY_6,
  import.meta.env.VITE_GEMINI_API_KEY_7,
  import.meta.env.VITE_GEMINI_API_KEY_8,
  import.meta.env.VITE_GEMINI_API_KEY_9
].filter((k): k is string => typeof k === 'string' && k.trim().length > 0);

const GEMINI_KEYS = RAW_KEYS.length > 0 ? RAW_KEYS : [''];

let currentKeyIndex = 0;

function getNextKey() {
  const key = GEMINI_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;
  return key;
}

// Leonardo AI Keys Pool
const LEONARDO_KEYS = [
  import.meta.env.VITE_LEONARDO_API_KEY,
  import.meta.env.VITE_LEONARDO_API_KEY_1,
  import.meta.env.VITE_LEONARDO_API_KEY_2,
  import.meta.env.VITE_LEONARDO_API_KEY_3
].filter((k): k is string => typeof k === 'string' && k.trim().length > 10);

// OpenRouter Keys Pool
const OPENROUTER_KEYS = [
  import.meta.env.VITE_OPENROUTER_API_KEY,
  import.meta.env.VITE_OPENROUTER_API_KEY_1,
  import.meta.env.VITE_OPENROUTER_API_KEY_2,
  import.meta.env.VITE_OPENROUTER_API_KEY_3
].filter((k): k is string => typeof k === 'string' && k.trim().length > 10);

let currentOpenRouterIndex = 0;
function getNextOpenRouterKey(): string | null {
  if (OPENROUTER_KEYS.length === 0) return null;
  const key = OPENROUTER_KEYS[currentOpenRouterIndex];
  currentOpenRouterIndex = (currentOpenRouterIndex + 1) % OPENROUTER_KEYS.length;
  return key;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

function createAI() {
  return new GoogleGenAI({
    apiKey: getNextKey(),
    httpOptions: { timeout: 10000 }
  });
}

const today = new Date().toISOString().split("T")[0];

async function withRetry<T>(fn: () => Promise<T>, retries = 1, delay = 800): Promise<T> {
  try {
    return await withTimeout(fn(), 10000, "API operation timed out after 10000ms");
  } catch (error: any) {
    const isNetworkError =
      error?.message?.includes('fetch') ||
      error?.message?.includes('network') ||
      error?.message?.includes('timeout') ||
      error?.message?.includes('timed out');
    const isRateLimit = error?.message?.includes('429') || error?.status === 429;

    if ((isNetworkError || isRateLimit) && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

function cleanJson(text: string): string {
  if (!text) return '{}';

  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

export const verifyApplicationExistence = async (target: string): Promise<{ exists: boolean; correctedName?: string; reason?: string }> => {
  try {
    return await withRetry(async () => {
      const ai = createAI();

      const prompt = `Verify if "${target}" is a real software/OS as of ${today}. Return JSON: { "exists": boolean, "correctedName": string, "reason": string }.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      try {
        return JSON.parse(cleanJson(response.text || '{}'));
      } catch {
        return { exists: false, reason: "Verification failed." };
      }
    });
  } catch (err) {
    console.warn("Direct Gemini verify failed, attempting OpenRouter failover...", err);
    const orKey = getNextOpenRouterKey();
    if (orKey) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Authorization": `Bearer ${orKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            max_tokens: 300,
            messages: [{ role: "user", content: `Verify if "${target}" is a real software/OS as of ${today}. Return JSON only: { "exists": boolean, "correctedName": string, "reason": string }.` }]
          })
        }).finally(() => clearTimeout(timer));
        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) return JSON.parse(cleanJson(text));
        }
      } catch (orErr) {
        console.warn("OpenRouter verify failover failed:", orErr);
      }
    }
    return { exists: true, correctedName: target };
  }
};

export function generateFallbackCurriculum(
  target: string,
  topic: string,
  version: string,
  mode: ExploringMode = ExploringMode.STANDARD
): AIResponse {
  const isExpert = mode === ExploringMode.EXPERT;
  return {
    overview: `${target} (${version}) provides comprehensive, professional capabilities for "${topic}". This interactive module walks through foundational principles, critical interface controls, verified shortcuts, and best practices tailored for this environment.`,
    steps: [
      {
        title: `1. Interface Discovery & Workspace Setup`,
        description: `Launch ${target} ${version} and locate the workspace designated for "${topic}". Identify the main toolbars, inspector palettes, and contextual status panels required for this task.`,
        visualCue: `Look for the top application menu bar and the primary viewport panel in ${target}.`,
        tips: [
          `Ensure ${target} is running version ${version} to access current interface conventions.`,
          `Reset the workspace layout to default if required panels are hidden.`
        ],
        actionLabel: `Inspect Workspace Layout`,
        difficulty: isExpert ? 'Intermediate' : 'Beginner'
      },
      {
        title: `2. Configure Core Preferences & Properties`,
        description: `Open the configuration or preferences panel for "${topic}". Adjust operational parameters, verify active unit systems or defaults, and prepare the project state.`,
        visualCue: `Open the Settings/Preferences dialog (gear icon or menu) and navigate to the '${topic}' section.`,
        tips: [
          `Save preference presets before applying modifications to enable rapid rollbacks.`,
          `Check available system memory and hardware acceleration settings if applicable.`
        ],
        actionLabel: `Configure Core Parameters`,
        difficulty: isExpert ? 'Advanced' : 'Beginner'
      },
      {
        title: `3. Execute Primary Action for ${topic}`,
        description: `Carry out the essential interaction required for "${topic}". Utilize the primary workspace tools, trigger commands, and observe real-time feedback in the preview window.`,
        visualCue: `Locate the main action trigger, viewport canvas, or command input area in ${target}.`,
        tips: [
          `Leverage keyboard shortcuts to accelerate repetitive operations.`,
          `Keep the properties/inspector pane open to inspect live parameters during execution.`
        ],
        actionLabel: `Execute Primary Action`,
        difficulty: isExpert ? 'Advanced' : 'Intermediate'
      },
      {
        title: `4. Verification & Diagnostic Inspection`,
        description: `Inspect the results of your actions to verify system integrity and output accuracy. Review status indicators, compiler/render outputs, or system logs.`,
        visualCue: `Check the status bar or preview panel for green verification indicators and clean logs.`,
        tips: [
          `Perform a quick sanity check before committing changes to production.`,
          `Consult error console logs if unexpected warnings or discrepancies appear.`
        ],
        actionLabel: `Verify Output Integrity`,
        difficulty: isExpert ? 'Advanced' : 'Intermediate'
      },
      {
        title: `5. Advanced Optimization & Workflow Polish`,
        description: `Refine your configuration with production-grade conventions for ${topic}. Organize presets, enable background automation, and establish reliable habits in ${target} ${version}.`,
        visualCue: `Access the export, presets, or optimization panel on the right sidebar.`,
        tips: [
          `Export your customized preset file to back up your setup across machines.`,
          `Explore related advanced shortcuts in the Tips section of this guide.`
        ],
        actionLabel: `Finalize & Save Workflow`,
        difficulty: 'Advanced'
      }
    ],
    commonShortcuts: [
      { key: 'Ctrl/Cmd + S', action: 'Quick Save current progress' },
      { key: 'Ctrl/Cmd + Z', action: 'Undo last change' },
      { key: 'Ctrl/Cmd + Shift + P', action: 'Open Command Palette / Search' },
      { key: 'F1 / Help', action: `Open documentation for ${topic}` }
    ],
    beginnerChecklist: [
      `Confirm ${target} ${version} is launched and properly configured`,
      `Locate the dedicated tool options or panel for ${topic}`,
      `Ensure essential panels are pinned and visible on screen`,
      `Test changes in a test or sandbox canvas before applying to master`
    ],
    faqs: [
      {
        question: `How do I revert changes if an issue occurs with ${topic}?`,
        answer: `Use the Undo command (Ctrl/Cmd+Z) or revert to the last saved checkpoint from the File menu.`
      },
      {
        question: `Are these steps identical across different versions of ${target}?`,
        answer: `Core mechanics remain consistent, though version ${version} features streamlined controls and improved responsiveness.`
      },
      {
        question: `Where can I find additional pro tips for this software?`,
        answer: `Browse the Tips tab in Tp2 Guide for curated expert shortcuts and high-efficiency techniques.`
      }
    ]
  };
}

export const getGuideContent = async (target: string, topic: string, version: string, mode: ExploringMode = ExploringMode.STANDARD): Promise<AIResponse> => {
  try {
    return await withRetry(async () => {
      const ai = createAI();

      const prompt = `Create a guide for "${topic}" in "${target}" version "${version}" accurate as of ${today}. Mode: ${mode}.
Return JSON with: overview, steps (title, description, visualCue, actionLabel), commonShortcuts, beginnerChecklist, faqs.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overview: { type: Type.STRING },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    visualCue: { type: Type.STRING },
                    tips: { type: Type.ARRAY, items: { type: Type.STRING } },
                    actionLabel: { type: Type.STRING },
                    difficulty: { type: Type.STRING }
                  }
                }
              },
              commonShortcuts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    action: { type: Type.STRING }
                  }
                }
              },
              beginnerChecklist: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              faqs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    answer: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const jsonStr = cleanJson(response.text || '{}');
      return JSON.parse(jsonStr) as AIResponse;
    });
  } catch (err) {
    console.warn("Direct Gemini guide generation failed, attempting OpenRouter failover...", err);
    const orKey = getNextOpenRouterKey();
    if (orKey) {
      try {
        const prompt = `Create a curriculum guide for "${topic}" in "${target}" version "${version}" as of ${today}. Mode: ${mode}.
Return ONLY valid JSON matching this schema:
{
  "overview": "string",
  "steps": [{ "title": "string", "description": "string", "visualCue": "string", "tips": ["string"], "actionLabel": "string", "difficulty": "Beginner|Intermediate|Advanced" }],
  "commonShortcuts": [{ "key": "string", "action": "string" }],
  "beginnerChecklist": ["string"],
  "faqs": [{ "question": "string", "answer": "string" }]
}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 7000);
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Authorization": `Bearer ${orKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            max_tokens: 2000,
            messages: [{ role: "user", content: prompt }]
          })
        }).finally(() => clearTimeout(timer));
        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) {
            return JSON.parse(cleanJson(text)) as AIResponse;
          }
        }
      } catch (orErr) {
        console.warn("OpenRouter curriculum failover failed:", orErr);
      }
    }
    console.warn("Generating smart fallback curriculum for:", target, topic);
    return generateFallbackCurriculum(target, topic, version, mode);
  }
};

export const generateStepImage = async (
  app: string,
  version: string,
  stepTitle: string,
  visualCue: string
): Promise<string | null> => {
  // 1. Gather all Leonardo keys: custom key from localStorage + pool from env
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('CUSTOM_LEONARDO_API_KEY') : null;
  const allLeonardoKeys = customKey ? [customKey, ...LEONARDO_KEYS] : LEONARDO_KEYS;

  for (const leonardoKey of allLeonardoKeys) {
    if (!leonardoKey || leonardoKey.trim().length <= 10) continue;
    try {
      const prompt = `Software UI screenshot of ${app} ${version}. Action: ${stepTitle}. Focus on ${visualCue}. Crisp high resolution desktop operating system software interface window.`;

      const response = await fetch("https://cloud.leonardo.ai/api/rest/v1/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${leonardoKey.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          modelId: "b24e16ff-06e3-43eb-8d33-4416c2d75876",
          width: 1024,
          height: 576
        })
      });

      if (response.ok) {
        const data = await response.json();
        const generationId = data?.sdGenerationJob?.generationId;
        if (generationId) {
          for (let attempt = 0; attempt < 4; attempt++) {
            await new Promise(r => setTimeout(r, attempt === 0 ? 5000 : 3000));
            const result = await fetch(
              `https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`,
              {
                headers: {
                  "Authorization": `Bearer ${leonardoKey.trim()}`
                }
              }
            );
            if (result.ok) {
              const resultData = await result.json();
              const imgs = resultData?.generations_by_pk?.generated_images;
              if (imgs && imgs.length > 0 && imgs[0].url) {
                return imgs[0].url;
              }
            }
          }
        }
      } else {
        console.warn("Leonardo AI key status:", response.status, "Trying next key or online engine.");
      }
    } catch (e) {
      console.warn("Leonardo AI key attempt error, trying next:", e);
    }
  }

  // 2. High-Quality Online Visual Generation (Pollinations AI - free, zero tokens needed)
  try {
    const cleanPrompt = encodeURIComponent(
      `modern software interface screenshot of ${app} ${version}, ${stepTitle}, showing ${visualCue}, software window interface, crisp high-res UI elements, clean digital product design`
    );
    const seed = Math.abs(hashCode(`${app}-${version}-${stepTitle}`));
    return `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1024&height=576&nologo=true&seed=${seed}`;
  } catch {
    return null;
  }
};

export const fetchOnlineContent = async (app: string, topic?: string): Promise<OnlineMediaItem[]> => {
  const searchQueries = [
    `${app} ${topic || ''} screenshot`,
    `${app} ${topic || ''}`,
    `${app} screenshot`,
    `${app} software`
  ];

  for (const q of searchQueries) {
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=1024&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const pages = data.query ? Object.values(data.query.pages) : [];
      const items: OnlineMediaItem[] = pages
        .map((p: any) => {
          const info = p.imageinfo ? p.imageinfo[0] : null;
          const thumb = info ? (info.thumburl || info.url) : null;
          const lowerTitle = (p.title || '').toLowerCase();
          if (
            !thumb ||
            thumb.endsWith('.pdf') ||
            thumb.endsWith('.djvu') ||
            lowerTitle.endsWith('.pdf') ||
            lowerTitle.endsWith('.djvu') ||
            lowerTitle.endsWith('.webm') ||
            lowerTitle.endsWith('.ogv')
          ) {
            return null;
          }
          return {
            title: p.title.replace(/^File:/, '').replace(/\.[^/.]+$/, ''),
            url: thumb,
            source: 'Wikimedia Commons'
          };
        })
        .filter((item): item is OnlineMediaItem => item !== null);

      if (items.length > 0) {
        return items;
      }
    } catch (err) {
      console.warn('Online media fetch error for query:', q, err);
    }
  }
  return [];
};

export const askAIQuestion = async (context: string, question: string): Promise<string> => {
  try {
    return await withRetry(async () => {
      const ai = createAI();
      const prompt = `Context: ${context}. Question: ${question}. Provide a helpful answer.`;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      return response.text || "Connection unclear.";
    }, 2);
  } catch (err) {
    console.warn("Direct Gemini failed, attempting OpenRouter failover...", err);
    const orKey = getNextOpenRouterKey();
    if (orKey) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Authorization": `Bearer ${orKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            max_tokens: 800,
            messages: [
              { role: "system", content: `You are an expert technical guide for: ${context}` },
              { role: "user", content: question }
            ]
          })
        }).finally(() => clearTimeout(timer));
        if (res.ok) {
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) return content;
        }
      } catch (orErr) {
        console.warn("OpenRouter fallback failed:", orErr);
      }
    }
    return `For "${question}" in ${context}: Make sure to check the application settings and keyboard shortcuts menu. You can also view full step-by-step guidance in the Tutorial tab.`;
  }
};

export const generateCustomTips = async (topic: string): Promise<ProTip[]> => {
  try {
    return await withRetry(async () => {
      const ai = createAI();
      const prompt = `Generate 4 high-impact professional power tips and keyboard shortcuts for "${topic}" as of ${today}.
Return JSON object: { "tips": [ { "title": string, "software": string, "category": string, "shortcut": string, "description": string, "impact": string, "difficulty": "Beginner" | "Intermediate" | "Advanced", "icon": string } ] }.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tips: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    software: { type: Type.STRING },
                    category: { type: Type.STRING },
                    shortcut: { type: Type.STRING },
                    description: { type: Type.STRING },
                    impact: { type: Type.STRING },
                    difficulty: { type: Type.STRING },
                    icon: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const parsed = JSON.parse(cleanJson(response.text || '{}'));
      const list = Array.isArray(parsed.tips) ? parsed.tips : [];
      return list.map((item: any, idx: number) => ({
        id: `ai-tip-${Date.now()}-${idx}`,
        title: item.title || 'Pro Optimization',
        software: item.software || topic,
        category: item.category || 'Productivity & Office',
        shortcut: item.shortcut || 'Pro Workflow',
        description: item.description || '',
        impact: item.impact || 'Saves Time',
        difficulty: (item.difficulty === 'Beginner' || item.difficulty === 'Advanced') ? item.difficulty : 'Intermediate',
        icon: item.icon || '⚡'
      }));
    });
  } catch (err) {
    console.warn("Direct Gemini tips generation failed, attempting OpenRouter failover...", err);
    const orKey = getNextOpenRouterKey();
    if (orKey) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Authorization": `Bearer ${orKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            max_tokens: 1500,
            messages: [{
              role: "user",
              content: `Generate 4 power user tips for "${topic}". Return ONLY valid JSON: { "tips": [ { "title": "string", "software": "string", "category": "string", "shortcut": "string", "description": "string", "impact": "string", "difficulty": "Intermediate", "icon": "⚡" } ] }`
            }]
          })
        }).finally(() => clearTimeout(timer));
        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) {
            const parsed = JSON.parse(cleanJson(text));
            const list = Array.isArray(parsed.tips) ? parsed.tips : [];
            return list.map((item: any, idx: number) => ({
              id: `or-tip-${Date.now()}-${idx}`,
              title: item.title || 'Pro Optimization',
              software: item.software || topic,
              category: item.category || 'Productivity & Office',
              shortcut: item.shortcut || 'Pro Workflow',
              description: item.description || '',
              impact: item.impact || 'Saves Time',
              difficulty: item.difficulty || 'Intermediate',
              icon: item.icon || '⚡'
            }));
          }
        }
      } catch (orErr) {
        console.warn("OpenRouter tips failover failed:", orErr);
      }
    }
    return [
      {
        id: `fallback-tip-1`,
        title: `Master Global Command Palette`,
        software: topic,
        category: `Productivity & Office`,
        shortcut: `Ctrl / Cmd + Shift + P`,
        description: `Access any feature or setting instantly in ${topic} without navigating menus.`,
        impact: `Instant Navigation`,
        difficulty: `Beginner`,
        icon: `⚡`
      },
      {
        id: `fallback-tip-2`,
        title: `Multi-Cursor & Quick Edit`,
        software: topic,
        category: `Productivity & Office`,
        shortcut: `Alt + Click / Ctrl + D`,
        description: `Edit multiple locations simultaneously or select consecutive matches.`,
        impact: `3x Faster Edits`,
        difficulty: `Intermediate`,
        icon: `🎯`
      },
      {
        id: `fallback-tip-3`,
        title: `Rapid State Checkpoints`,
        software: topic,
        category: `Productivity & Office`,
        shortcut: `Ctrl / Cmd + S`,
        description: `Establish frequent checkpoints before major modifications to avoid data loss.`,
        impact: `Zero Data Loss`,
        difficulty: `Beginner`,
        icon: `💾`
      },
      {
        id: `fallback-tip-4`,
        title: `Custom Workspace Profiles`,
        software: topic,
        category: `Productivity & Office`,
        shortcut: `Window > Workspace > Save`,
        description: `Save custom panel layouts tailored for ${topic} workflows.`,
        impact: `Cleaner Workspace`,
        difficulty: `Advanced`,
        icon: `🛠️`
      }
    ];
  }
};

