import { GoogleGenAI, Type, type Content, type FunctionDeclaration } from '@google/genai';
import { KERALA_LOCATIONS, SERVICE_CATEGORIES } from '../shared/keralaData.ts';
import type {
  LanguageCode,
  PhotoAnalysisResult,
  PublicUser,
  SmartModeExtraction,
} from '../shared/types.ts';
import { getStore, searchProvidersInDb } from './db.ts';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const searchProvidersTool: FunctionDeclaration = {
  name: 'searchProviders',
  description:
    'Search the real LocalConnect provider database in Kerala by service keyword, category, subcategory, town, district, PIN code, max price, or availability.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Service name, skill, or provider keyword, e.g. electrician, AC repair, mathematics tutor, plumber',
      },
      townOrDistrict: {
        type: Type.STRING,
        description: 'Kerala town, district, or PIN code such as Tirur, Malappuram, Kozhikode, Kochi, 676101',
      },
      categoryId: {
        type: Type.STRING,
        description:
          'Optional category ID: appliance-repair, home-services, construction, rental-vehicles, daily-needs, beauty-grooming, event-services, education-tuition',
      },
      availableOnly: {
        type: Type.BOOLEAN,
        description: 'Set true when user asks for someone available right now or tomorrow',
      },
      maxPrice: {
        type: Type.NUMBER,
        description: 'Optional maximum starting price in INR',
      },
    },
  },
};

const getCategoriesTool: FunctionDeclaration = {
  name: 'getCategories',
  description: 'List all service categories and subcategories supported on LocalConnect.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getMyActivityTool: FunctionDeclaration = {
  name: 'getMyActivity',
  description:
    'Retrieve the currently signed-in user’s own service requests, received quotations, or active bookings. Never returns another user’s private data.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const prepareServiceRequestDraftTool: FunctionDeclaration = {
  name: 'prepareServiceRequestDraft',
  description:
    'Prepare a structured service request draft for customer confirmation before submitting. NEVER books without customer confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      categoryId: { type: Type.STRING, description: 'Category ID matching the service' },
      subcategoryId: { type: Type.STRING, description: 'Subcategory ID matching the service' },
      title: { type: Type.STRING, description: 'Concise request title' },
      description: { type: Type.STRING, description: 'Problem description from the customer' },
      town: { type: Type.STRING, description: 'Kerala town name' },
      preferredDate: { type: Type.STRING, description: 'YYYY-MM-DD preferred date if provided' },
      preferredTime: { type: Type.STRING, description: 'Preferred time window if provided' },
      targetProviderId: { type: Type.STRING, description: 'Optional specific provider ID' },
    },
    required: ['categoryId', 'subcategoryId', 'title', 'description', 'town'],
  },
};

export interface AiChatRequest {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  language?: LanguageCode;
  user?: PublicUser | null;
  mode?: 'customer' | 'provider';
}

export interface AiMatchedProvider {
  id: string;
  name: string;
  title: string;
  town: string;
  district: string;
  startingPrice: number;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  isDemo: boolean;
  verified: boolean;
}

export interface AiBookingDraft {
  categoryId: string;
  subcategoryId: string;
  title: string;
  description: string;
  town: string;
  preferredDate?: string;
  preferredTime?: string;
  targetProviderId?: string;
}

export interface AiChatResponse {
  reply: string;
  matchedProviders: AiMatchedProvider[];
  bookingDraft?: AiBookingDraft | null;
  usedFallback?: boolean;
}

function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  user: PublicUser | null | undefined,
  collectedProviders: AiMatchedProvider[],
  setDraft: (d: AiBookingDraft) => void
): unknown {
  const db = getStore();

  if (name === 'searchProviders') {
    const query = typeof args.query === 'string' ? args.query : '';
    const loc = typeof args.townOrDistrict === 'string' ? args.townOrDistrict : '';
    const locObj = loc
      ? KERALA_LOCATIONS.find(
          (l) =>
            l.town.toLowerCase() === loc.toLowerCase() ||
            l.district.toLowerCase() === loc.toLowerCase() ||
            l.pincode === loc
        )
      : undefined;

    let searchResult = searchProvidersInDb({
      q: query || undefined,
      town: locObj && loc.toLowerCase() === locObj.town.toLowerCase() ? locObj.town : undefined,
      district: locObj ? locObj.district : undefined,
      categoryId: typeof args.categoryId === 'string' ? args.categoryId : undefined,
      availableOnly: typeof args.availableOnly === 'boolean' ? args.availableOnly : undefined,
      maxPrice: typeof args.maxPrice === 'number' ? args.maxPrice : undefined,
      userLat: locObj?.lat,
      userLng: locObj?.lng,
      sortBy: locObj ? 'nearest' : 'relevant',
      limit: 6,
    });
    if (searchResult.total === 0 && locObj) {
      searchResult = searchProvidersInDb({
        q: query || undefined,
        categoryId: typeof args.categoryId === 'string' ? args.categoryId : undefined,
        availableOnly: typeof args.availableOnly === 'boolean' ? args.availableOnly : undefined,
        maxPrice: typeof args.maxPrice === 'number' ? args.maxPrice : undefined,
        userLat: locObj.lat,
        userLng: locObj.lng,
        sortBy: 'nearest',
        limit: 6,
      });
    }

    const mapped: AiMatchedProvider[] = searchResult.providers.map((p) => ({
      id: p.id,
      name: p.name,
      title: p.title,
      town: p.town,
      district: p.district,
      startingPrice: p.startingPrice,
      rating: p.rating,
      reviewCount: p.reviewCount,
      isAvailable: p.isAvailable,
      isDemo: p.isDemo,
      verified: p.identityVerified && p.profileVerified,
    }));

    for (const m of mapped) {
      if (!collectedProviders.some((x) => x.id === m.id)) {
        collectedProviders.push(m);
      }
    }

    return {
      totalFound: searchResult.total,
      note: 'All listed prices are starting estimates; final cost requires a provider quotation. Demo profiles are marked isDemo=true.',
      providers: mapped,
    };
  }

  if (name === 'getCategories') {
    return db.categories.map((c) => ({
      id: c.id,
      name: c.name,
      subcategories: c.subcategories.map((s) => ({
        id: s.id,
        name: s.name,
        typicalPriceRange: s.typicalPriceRange,
      })),
    }));
  }

  if (name === 'getMyActivity') {
    if (!user) {
      return { signedIn: false, message: 'User is not signed in. Invite them to sign in or use a Demo Account.' };
    }
    if (user.activeMode === 'provider') {
      const providerProfile = db.providers.find((p) => p.userId === user.id);
      if (!providerProfile) return { signedIn: true, role: 'provider', hasProfile: false };
      const openRequests = db.serviceRequests.filter((r) =>
        providerProfile.categoryIds.includes(r.categoryId)
      );
      const myBookings = db.bookings.filter((b) => b.providerId === providerProfile.id);
      return {
        signedIn: true,
        role: 'provider',
        providerName: providerProfile.name,
        matchingOpenRequests: openRequests.slice(0, 5).map((r) => ({
          id: r.id,
          title: r.title,
          town: r.town,
          preferredDate: r.preferredDate,
          status: r.status,
        })),
        activeBookings: myBookings.map((b) => ({
          id: b.id,
          serviceTitle: b.serviceTitle,
          status: b.status,
          agreedPrice: b.agreedPrice,
          preferredDate: b.preferredDate,
        })),
      };
    }

    const myReqs = db.serviceRequests.filter((r) => r.customerId === user.id);
    const myBookings = db.bookings.filter((b) => b.customerId === user.id);
    return {
      signedIn: true,
      role: 'customer',
      requests: myReqs.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        quotationsCount: db.quotations.filter((q) => q.requestId === r.id).length,
      })),
      bookings: myBookings.map((b) => ({
        id: b.id,
        serviceTitle: b.serviceTitle,
        providerName: b.providerName,
        status: b.status,
        agreedPrice: b.agreedPrice,
      })),
    };
  }

  if (name === 'prepareServiceRequestDraft') {
    const draft: AiBookingDraft = {
      categoryId: String(args.categoryId || 'home-services'),
      subcategoryId: String(args.subcategoryId || 'electrician'),
      title: String(args.title || 'Service Request'),
      description: String(args.description || ''),
      town: String(args.town || user?.town || 'Tirur'),
      preferredDate: typeof args.preferredDate === 'string' ? args.preferredDate : undefined,
      preferredTime: typeof args.preferredTime === 'string' ? args.preferredTime : undefined,
      targetProviderId: typeof args.targetProviderId === 'string' ? args.targetProviderId : undefined,
    };
    setDraft(draft);
    return {
      draftPrepared: true,
      draft,
      instruction:
        'Present this draft clearly to the customer and tell them they can review and click "Open Request Form" to confirm and submit. Never claim the booking is already submitted.',
    };
  }

  return { error: 'Unknown tool' };
}

function buildFallbackResponse(req: AiChatRequest): AiChatResponse {
  const q = req.message;
  const result = searchProvidersInDb({ q, limit: 4 });
  const matchedProviders: AiMatchedProvider[] = result.providers.map((p) => ({
    id: p.id,
    name: p.name,
    title: p.title,
    town: p.town,
    district: p.district,
    startingPrice: p.startingPrice,
    rating: p.rating,
    reviewCount: p.reviewCount,
    isAvailable: p.isAvailable,
    isDemo: p.isDemo,
    verified: p.identityVerified && p.profileVerified,
  }));

  const lang = req.language || 'en';
  let reply = '';
  if (matchedProviders.length > 0) {
    if (lang === 'ml') {
      reply = `നിങ്ങളുടെ ആവശ്യവുമായി പൊരുത്തപ്പെടുന്ന ${matchedProviders.length} പ്രൊഫൈലുകൾ കണ്ടെത്തി. താഴെ കാണുന്ന പ്രൊഫൈലുകൾ തുറന്ന് ക്വട്ടേഷൻ ആവശ്യപ്പെടാം (ആരംഭ നിരക്കുകൾ ഏകദേശമാണ്):`;
    } else if (lang === 'hi') {
      reply = `आपकी खोज से मेल खाने वाले ${matchedProviders.length} प्रदाता मिले हैं। आप नीचे उनकी प्रोफ़ाइल खोलकर कोटेशन माँग सकते हैं (शुरुआती शुल्क अनुमानित हैं):`;
    } else {
      reply = `I searched the LocalConnect database and found ${matchedProviders.length} matching specialist${matchedProviders.length > 1 ? 's' : ''}. You can open any profile below to view details or request a quotation (shown starting prices are estimates only; confirmed pricing comes via provider quotation).`;
    }
  } else {
    if (lang === 'ml') {
      reply =
        'ഈ തിരയലിൽ നേരിട്ടുള്ള പ്രൊഫൈലുകൾ കണ്ടെത്തിയില്ല. ദയവായി സേവന വിഭാഗം (ഉദാ: Electrician, Plumber, AC repair) അല്ലെങ്കിൽ കേരളത്തിലെ സ്ഥലനാമം (Tirur, Kozhikode, Kochi) വ്യക്തമാക്കൂ.';
    } else if (lang === 'hi') {
      reply =
        'इस खोज के लिए कोई सीधा प्रदाता नहीं मिला। कृपया सेवा (जैसे Electrician, AC repair, Home tuition) और शहर का नाम (जैसे Tirur, Kozhikode) बताएं।';
    } else {
      reply =
        'I could not find an exact provider match for that query in our database. Could you share the service type (such as Electrician, AC repair, Plumber, or Mathematics tutor) and your Kerala town or PIN code?';
    }
  }

  return {
    reply,
    matchedProviders,
    usedFallback: true,
  };
}

export async function handleAiChat(req: AiChatRequest): Promise<AiChatResponse> {
  const ai = getAiClient();
  if (!ai) {
    return buildFallbackResponse(req);
  }

  const langLabel =
    req.language === 'ml' ? 'Malayalam' : req.language === 'hi' ? 'Hindi' : 'English';

  const systemInstruction = `You are LocalConnect AI, the helpful assistant for LocalConnect — Kerala's zero-commission local services marketplace ("Your Neighbourhood. Your Services.").
Current UI language preference: ${langLabel}. Respond in ${langLabel} unless the user clearly writes in another language (English, Malayalam, or Hindi).
Current user mode: ${req.mode || req.user?.activeMode || 'customer'}.
Signed-in user: ${req.user ? `${req.user.name} (${req.user.town}, ${req.user.district})` : 'Guest visitor'}.

STRICT ACCURACY & SAFETY RULES:
1. NEVER invent provider names, phone numbers, ratings, prices, or availability. ALWAYS call searchProviders or getCategories to look up real database records.
2. Distinguish clearly between listed starting price estimates and confirmed quotations.
3. Indicate if a provider profile is a Demo Profile when summarizing results.
4. NEVER confirm or submit a booking automatically. If the user wants to book/request a service and you have enough info (or ask 1 missing question at a time for date/town/issue), use prepareServiceRequestDraft so they can review and confirm in the UI.
5. Respect privacy: NEVER reveal another user's private info, phone numbers of customers, or internal IDs.
6. If the user is a Service Provider asking for help (writing service descriptions, understanding quotations, managing requests), offer practical, tailored advice for Kerala households.
7. Keep responses concise, structured, warm, and free of hype.`;

  const contents: Content[] = [];
  if (Array.isArray(req.history)) {
    for (const h of req.history.slice(-8)) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }],
      });
    }
  }
  contents.push({ role: 'user', parts: [{ text: req.message }] });

  const collectedProviders: AiMatchedProvider[] = [];
  let bookingDraft: AiBookingDraft | null = null;

  try {
    const tools = [
      {
        functionDeclarations: [
          searchProvidersTool,
          getCategoriesTool,
          getMyActivityTool,
          prepareServiceRequestDraftTool,
        ],
      },
    ];

    let response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction,
        tools,
      },
    });

    // Up to 3 tool-calling turns
    for (let step = 0; step < 3; step++) {
      const fnCalls = response.functionCalls;
      if (!fnCalls || fnCalls.length === 0) break;

      const modelContent = response.candidates?.[0]?.content;
      if (modelContent) {
        contents.push(modelContent);
      }

      const responseParts = fnCalls.map((call) => {
        const result = executeToolCall(
          call.name || '',
          (call.args as Record<string, unknown>) || {},
          req.user,
          collectedProviders,
          (d) => {
            bookingDraft = d;
          }
        );
        return {
          functionResponse: {
            id: call.id,
            name: call.name || '',
            response: { result },
          },
        };
      });

      contents.push({ role: 'user', parts: responseParts });

      response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          tools,
        },
      });
    }

    const text = (response.text || '').trim();
    if (!text) {
      return buildFallbackResponse(req);
    }

    return {
      reply: text,
      matchedProviders: collectedProviders.slice(0, 6),
      bookingDraft,
      usedFallback: false,
    };
  } catch (err) {
    console.error('Gemini AI error (falling back cleanly):', err);
    return buildFallbackResponse(req);
  }
}

// --- V2: AI PHOTO PROBLEM DETECTOR ---
function buildFallbackPhotoAnalysis(note: string): PhotoAnalysisResult {
  const lower = (note || '').toLowerCase();
  if (/tap|pipe|leak|sink|water|plumb|valve|drain|tank/.test(lower)) {
    return {
      possibleProblems: [
        'Worn tap cartridge, washer, or loose compression joint',
        'Supply line seal wear or hairline fitting seepage',
      ],
      observations: [
        'Visible moisture or plumbing fixture described in your upload',
        'Exact internal washer or concealed thread wear requires on-site inspection',
      ],
      uncertaintyNote:
        'A photograph alone cannot confirm whether internal valve seats or concealed pipe threads are cracked. An on-site plumber inspection is needed for an accurate quotation.',
      safetyWarning:
        'Shut off the nearest angle valve or main overhead line gently before removing fittings, and avoid forcing corroded metal joints.',
      suggestedCategoryId: 'home-services',
      suggestedCategoryName: 'Home Services',
      suggestedSubcategoryId: 'plumber',
      suggestedSubcategoryName: 'Plumber',
      recommendedQuestions: [
        'Does your visiting inspection fee cover basic washer/o-ring replacement?',
        'Should I keep a replacement ceramic cartridge or mixer ready, or will you bring spares?',
        'What is your estimated arrival time?',
      ],
      draftTitle: 'Plumbing leak / fixture inspection',
      draftDescription: note
        ? `Photo submitted for plumbing inspection. Customer note: ${note}`
        : 'Uploaded photo of plumbing / tap issue for inspection and quotation.',
    };
  }
  if (/switch|wire|socket|spark|mcb|electric|fan|breaker|inverter/.test(lower)) {
    return {
      possibleProblems: [
        'Loose terminal contact, heat-stressed socket plate, or faulty switch module',
        'Overloaded circuit breaker or moisture ingress inside wall box',
      ],
      observations: [
        'Electrical fixture / wiring concern visible or noted in submission',
        'Internal insulation health and earth leakage cannot be verified from a photo alone',
      ],
      uncertaintyNote:
        'Visual inspection from a photograph cannot determine hidden wire gauge, earthing continuity, or circuit load. Please have a licensed electrician test with proper instruments.',
      safetyWarning:
        'Do NOT open live switchboards, touch exposed copper conductors, or attempt DIY electrical repairs. Switch off the main MCB/ELCB if you smell burning or see sparks.',
      suggestedCategoryId: 'home-services',
      suggestedCategoryName: 'Home Services',
      suggestedSubcategoryId: 'electrician',
      suggestedSubcategoryName: 'Electrician',
      recommendedQuestions: [
        'Are you available to test circuit load and earthing with a clamp meter / tester?',
        'Do you carry standard modular switches or MCB replacements?',
        'What is the estimated inspection charge?',
      ],
      draftTitle: 'Electrical switch / wiring safety inspection',
      draftDescription: note
        ? `Photo submitted for licensed electrician check. Note: ${note}`
        : 'Uploaded photo of electrical fixture concern for safe professional inspection.',
    };
  }
  if (/ac|air|fridge|refrigerator|washing|tv|appliance/.test(lower)) {
    return {
      possibleProblems: [
        'Blocked filter/drain line, sensor fault, or component wear',
        'Power supply relay or motor capacitor issue',
      ],
      observations: [
        'Home appliance issue submitted via photo upload',
        'Error codes, compressor health, and refrigerant pressure require physical testing',
      ],
      uncertaintyNote:
        'A photograph cannot confirm internal compressor, PCB, or refrigerant conditions. An appliance technician needs to inspect the unit in person before confirming repair cost.',
      safetyWarning:
        'Unplug the appliance from the wall socket before cleaning exterior vents, and do not open sealed compressor, capacitor, or microwave high-voltage panels.',
      suggestedCategoryId: 'appliance-repair',
      suggestedCategoryName: 'Appliance Repair',
      suggestedSubcategoryId: 'ac-repair',
      suggestedSubcategoryName: 'AC repair',
      recommendedQuestions: [
        'Do you service this brand and carry genuine spares if needed?',
        'What is the inspection fee if a major spare needs ordering?',
        'When is your earliest available visit slot?',
      ],
      draftTitle: 'Appliance inspection & repair quotation request',
      draftDescription: note
        ? `Photo uploaded for appliance inspection. Customer note: ${note}`
        : 'Uploaded photo of household appliance issue for technician evaluation.',
    };
  }
  return {
    possibleProblems: [
      'Surface wear, fixture misalignment, or moisture/structural maintenance need',
      'Possible underlying fitting or component fatigue',
    ],
    observations: [
      'Uploaded household issue photo ready for technician review',
      'Physical measurements and material inspection are required to confirm scope',
    ],
    uncertaintyNote:
      'A photograph alone gives preliminary context and cannot guarantee a definitive diagnosis. Ask a verified local specialist for an on-site estimate.',
    safetyWarning:
      'Avoid dismantling pressurized plumbing, electrical panels, or load-bearing fixtures yourself before a technician inspects the site.',
    suggestedCategoryId: 'home-services',
    suggestedCategoryName: 'Home Services',
    suggestedSubcategoryId: 'carpenter',
    suggestedSubcategoryName: 'Carpenter',
    recommendedQuestions: [
      'Can you share an estimated inspection & labour quote based on this issue?',
      'Are materials included or billed separately with receipts?',
      'How soon can you visit my locality?',
    ],
    draftTitle: 'Household repair inspection request',
    draftDescription: note
      ? `Photo uploaded for specialist quotation. Customer note: ${note}`
      : 'Uploaded photo of household maintenance issue for provider quotes.',
  };
}

export async function handlePhotoAnalysis(params: {
  imageBase64: string;
  mimeType: string;
  note?: string;
}): Promise<{ analysis: PhotoAnalysisResult; usedFallback: boolean }> {
  const ai = getAiClient();
  const note = (params.note || '').trim();
  if (!ai) {
    return { analysis: buildFallbackPhotoAnalysis(note), usedFallback: true };
  }

  const categoryRef = SERVICE_CATEGORIES.map(
    (c) =>
      `${c.id} (${c.name}): ${c.subcategories.map((s) => `${s.id} (${s.name})`).join(', ')}`
  ).join('\n');

  const cleanBase64 = params.imageBase64.replace(/^data:[^;]+;base64,/, '');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: params.mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text:
              `Analyze this household maintenance photo for a customer in Kerala, India.\n` +
              `Customer note: ${note || 'None provided.'}\n\n` +
              `Available LocalConnect categoryIds and subcategoryIds:\n${categoryRef}\n\n` +
              `Strict safety & honesty rules:\n` +
              `1. Never claim certainty from an image alone — clearly express uncertainty.\n` +
              `2. Never give dangerous DIY electrical, gas, pressure, or internal appliance repair instructions.\n` +
              `3. Pick the single best matching suggestedCategoryId and suggestedSubcategoryId from the list above.\n` +
              `4. Recommend 3 practical questions the customer can ask providers before booking.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            possibleProblems: { type: Type.ARRAY, items: { type: Type.STRING } },
            observations: { type: Type.ARRAY, items: { type: Type.STRING } },
            uncertaintyNote: { type: Type.STRING },
            safetyWarning: { type: Type.STRING },
            suggestedCategoryId: { type: Type.STRING },
            suggestedCategoryName: { type: Type.STRING },
            suggestedSubcategoryId: { type: Type.STRING },
            suggestedSubcategoryName: { type: Type.STRING },
            recommendedQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            draftTitle: { type: Type.STRING },
            draftDescription: { type: Type.STRING },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text || '{}').trim()) as Partial<PhotoAnalysisResult>;
    if (!parsed.suggestedCategoryId || !parsed.possibleProblems?.length) {
      return { analysis: buildFallbackPhotoAnalysis(note), usedFallback: true };
    }
    const validCat =
      SERVICE_CATEGORIES.find((c) => c.id === parsed.suggestedCategoryId) || SERVICE_CATEGORIES[1];
    const validSub =
      validCat.subcategories.find((s) => s.id === parsed.suggestedSubcategoryId) ||
      validCat.subcategories[0];

    return {
      analysis: {
        possibleProblems: parsed.possibleProblems,
        observations: parsed.observations || [],
        uncertaintyNote:
          parsed.uncertaintyNote ||
          'A photograph cannot confirm hidden faults. Final scope requires an on-site provider inspection.',
        safetyWarning:
          parsed.safetyWarning ||
          'Avoid touching exposed electrical wiring or dismantling pressurized fixtures before a technician arrives.',
        suggestedCategoryId: validCat.id,
        suggestedCategoryName: validCat.name,
        suggestedSubcategoryId: validSub.id,
        suggestedSubcategoryName: validSub.name,
        recommendedQuestions: parsed.recommendedQuestions || [],
        draftTitle: parsed.draftTitle || `${validSub.name} inspection request`,
        draftDescription: parsed.draftDescription || note || 'Uploaded issue photo for quotation.',
      },
      usedFallback: false,
    };
  } catch (err) {
    console.error('Gemini photo analysis error:', err);
    return { analysis: buildFallbackPhotoAnalysis(note), usedFallback: true };
  }
}

// --- V2: LOCALCONNECT SMART MODE ---
function parseSmartModeLocally(query: string): SmartModeExtraction {
  const qLower = query.toLowerCase();
  const loc = KERALA_LOCATIONS.find(
    (l) =>
      qLower.includes(l.town.toLowerCase()) ||
      qLower.includes(l.district.toLowerCase()) ||
      qLower.includes(l.pincode) ||
      (l.town === 'Tirur' && (qLower.includes('tiruril') || qLower.includes('tiroor')))
  );

  let matchedCatId: string | undefined;
  let matchedSubId: string | undefined;
  let serviceLabel = '';

  const keywordMap: Array<{ re: RegExp; cat: string; sub: string; label: string }> = [
    { re: /electric|elcb|mcb|wiring|switch|inverter|fan|വൈദ്യുത/, cat: 'home-services', sub: 'electrician', label: 'Electrician' },
    { re: /plumb|tap|leak|pipe|tank|bathroom|sink|വെള്ള|പൈപ്പ്/, cat: 'home-services', sub: 'plumber', label: 'Plumber' },
    { re: /ac|air\s*con|cooling|split ac/, cat: 'appliance-repair', sub: 'ac-repair', label: 'AC repair' },
    { re: /fridge|refrigerator|freezer/, cat: 'appliance-repair', sub: 'refrigerator-repair', label: 'Refrigerator repair' },
    { re: /washing\s*machine|washer/, cat: 'appliance-repair', sub: 'washing-machine-repair', label: 'Washing machine repair' },
    { re: /tv|television/, cat: 'appliance-repair', sub: 'tv-repair', label: 'TV repair' },
    { re: /carpent|wood|door|furniture|cupboard/, cat: 'home-services', sub: 'carpenter', label: 'Carpenter' },
    { re: /clean|maid|housekeeping/, cat: 'home-services', sub: 'cleaning', label: 'Cleaning' },
    { re: /paint|wall|damp/, cat: 'home-services', sub: 'painting', label: 'Painting' },
    { re: /pest|termite|cockroach/, cat: 'home-services', sub: 'pest-control', label: 'Pest control' },
    { re: /weld|gate|grill|fabrication/, cat: 'construction', sub: 'welding', label: 'Welding' },
    { re: /mason|brick|concrete|tile|interior/, cat: 'construction', sub: 'mason', label: 'Mason' },
    { re: /car|taxi|tempo|truck|driver|shifting/, cat: 'rental-vehicles', sub: 'car-rental', label: 'Car rental' },
    { re: /garden|water\s*delivery|tanker/, cat: 'daily-needs', sub: 'water-delivery', label: 'Water delivery' },
    { re: /mehendi|henna|makeup|salon|hair|beauty/, cat: 'beauty-grooming', sub: 'mehendi', label: 'Mehendi' },
    { re: /photo|cater|sadya|decor|dj|tent|event/, cat: 'event-services', sub: 'photography', label: 'Photography' },
    { re: /math|tuition|tutor|science|physics|chemistry|computer|spoken|class/, cat: 'education-tuition', sub: 'home-tuition', label: 'Home tuition' },
  ];

  for (const item of keywordMap) {
    if (item.re.test(qLower)) {
      matchedCatId = item.cat;
      matchedSubId = item.sub;
      serviceLabel = item.label;
      break;
    }
  }

  let preferredDate: string | undefined;
  const now = new Date();
  if (qLower.includes('today') || qLower.includes('innu') || qLower.includes('ഇന്ന്') || qLower.includes('आज')) {
    preferredDate = now.toISOString().slice(0, 10);
  } else if (
    qLower.includes('tomorrow') ||
    qLower.includes('nale') ||
    qLower.includes('നാളെ') ||
    qLower.includes('कल')
  ) {
    preferredDate = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  }

  const budgetMatch = query.match(/(?:₹|rs\.?|rupees?|budget(?:\s*(?:is|around|under))?)\s*(\d{2,6})/i);
  const budgetMax = budgetMatch ? Number(budgetMatch[1]) : undefined;

  const missingInfo: string[] = [];
  if (!serviceLabel) missingInfo.push('Specific service or trade needed');
  if (!loc) missingInfo.push('Preferred Kerala town or PIN code');
  if (!preferredDate) missingInfo.push('Preferred visit date');

  return {
    serviceQuery: serviceLabel || query.trim(),
    categoryId: matchedCatId,
    subcategoryId: matchedSubId,
    town: loc?.town,
    district: loc?.district,
    preferredDate,
    budgetMax,
    missingInfo,
    explanation: `Matched ${serviceLabel || 'local services'}${loc ? ` near ${loc.town}, ${loc.district}` : ''}${budgetMax ? ` with listed starting prices up to ₹${budgetMax} (final quotation confirmed by provider)` : ''}.`,
  };
}

export async function handleSmartMode(params: {
  query: string;
  userLat?: number;
  userLng?: number;
}) {
  const ai = getAiClient();
  let extraction = parseSmartModeLocally(params.query);
  let usedFallback = !ai;

  if (ai) {
    const categoryRef = SERVICE_CATEGORIES.map(
      (c) => `${c.id}: ${c.subcategories.map((s) => s.id).join(', ')}`
    ).join('\n');
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents:
          `Extract structured booking intent from this customer request in Kerala (may include English, Malayalam, Manglish, or Hindi):\n` +
          `"${params.query}"\n\n` +
          `Today ISO date: ${new Date().toISOString().slice(0, 10)}\n` +
          `Categories & Subcategories:\n${categoryRef}\n` +
          `Towns include: ${KERALA_LOCATIONS.map((l) => l.town).join(', ')}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              serviceQuery: { type: Type.STRING },
              categoryId: { type: Type.STRING },
              subcategoryId: { type: Type.STRING },
              town: { type: Type.STRING },
              district: { type: Type.STRING },
              preferredDate: { type: Type.STRING },
              budgetMax: { type: Type.NUMBER },
              missingInfo: { type: Type.ARRAY, items: { type: Type.STRING } },
              explanation: { type: Type.STRING },
            },
          },
        },
      });
      const parsed = JSON.parse((response.text || '{}').trim()) as Partial<SmartModeExtraction>;
      if (parsed.serviceQuery) {
        extraction = {
          serviceQuery: parsed.serviceQuery,
          categoryId: parsed.categoryId || extraction.categoryId,
          subcategoryId: parsed.subcategoryId || extraction.subcategoryId,
          town: parsed.town || extraction.town,
          district: parsed.district || extraction.district,
          preferredDate: parsed.preferredDate || extraction.preferredDate,
          budgetMax: typeof parsed.budgetMax === 'number' && parsed.budgetMax > 0 ? parsed.budgetMax : extraction.budgetMax,
          missingInfo: Array.isArray(parsed.missingInfo) ? parsed.missingInfo : extraction.missingInfo,
          explanation: parsed.explanation || extraction.explanation,
        };
      } else {
        usedFallback = true;
      }
    } catch (err) {
      console.error('Gemini Smart Mode extraction error:', err);
      usedFallback = true;
    }
  }

  const extractedLoc =
    extraction.town || extraction.district
      ? KERALA_LOCATIONS.find(
          (l) =>
            (extraction.town && l.town.toLowerCase() === extraction.town.toLowerCase()) ||
            (extraction.district && l.district.toLowerCase() === extraction.district.toLowerCase())
        )
      : undefined;
  const effectiveLat = params.userLat ?? extractedLoc?.lat;
  const effectiveLng = params.userLng ?? extractedLoc?.lng;

  let searchRes = searchProvidersInDb({
    q: extraction.subcategoryId ? undefined : extraction.serviceQuery,
    categoryId: extraction.categoryId,
    subcategoryId: extraction.subcategoryId,
    town: extraction.town,
    district: extraction.district,
    maxPrice: extraction.budgetMax,
    userLat: effectiveLat,
    userLng: effectiveLng,
    sortBy: effectiveLat ? 'nearest' : 'highest_rated',
    limit: 12,
  });

  // Broaden slightly if town + budget filtered to zero so user sees nearby options transparently
  if (searchRes.total === 0 && (extraction.town || extraction.budgetMax)) {
    searchRes = searchProvidersInDb({
      q: extraction.subcategoryId ? undefined : extraction.serviceQuery,
      categoryId: extraction.categoryId,
      subcategoryId: extraction.subcategoryId,
      district: extraction.district,
      userLat: effectiveLat,
      userLng: effectiveLng,
      sortBy: effectiveLat ? 'nearest' : 'highest_rated',
      limit: 12,
    });
    if (searchRes.total > 0) {
      extraction.explanation +=
        ' (Expanded beyond exact town/budget filter to show closest matching Kerala professionals — listed starting prices are estimates only.)';
    }
  }

  // Final statewide fallback ordered by distance from the requested town if district had zero matches
  if (searchRes.total === 0 && (extraction.district || extraction.subcategoryId || extraction.categoryId)) {
    searchRes = searchProvidersInDb({
      q: extraction.subcategoryId ? undefined : extraction.serviceQuery,
      categoryId: extraction.categoryId,
      subcategoryId: extraction.subcategoryId,
      userLat: effectiveLat,
      userLng: effectiveLng,
      sortBy: effectiveLat ? 'nearest' : 'highest_rated',
      limit: 12,
    });
    if (searchRes.total > 0) {
      extraction.explanation +=
        ' (No specialist registered right in that town yet — showing closest Kerala professionals ordered by distance; starting prices are estimates only.)';
    }
  }

  return {
    extraction,
    providers: searchRes.providers,
    total: searchRes.total,
    suggestions: searchRes.suggestions,
    usedFallback,
  };
}

// --- V2: MALAYALAM AUTOMATIC TRANSLATOR FOR CHAT ---
function detectScriptLanguage(text: string): LanguageCode {
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}

const PHRASE_GLOSSARY: Array<{
  en: string;
  ml: string;
  hi: string;
  patterns: RegExp[];
}> = [
  {
    en: 'Can you come tomorrow morning?',
    ml: 'നാളെ രാവിലെ വരാൻ കഴിയുമോ?',
    hi: 'क्या आप कल सुबह आ सकते हैं?',
    patterns: [/tomorrow morning/i, /നാളെ രാവിലെ/, /कल सुबह/],
  },
  {
    en: 'Please share the estimated quotation and arrival time.',
    ml: 'ദയവായി ഏകദേശ നിരക്കും എത്തുന്ന സമയവും അറിയിക്കൂ.',
    hi: 'कृपया अनुमानित शुल्क और पहुँचने का समय बताएं।',
    patterns: [/quotation|estimate|arrival/i, /നിരക്ക|സമയ/, /अनुमानित|समय/],
  },
  {
    en: 'Thank you, I am on my way now.',
    ml: 'നന്ദി, ഞാൻ ഇപ്പോൾ പുറപ്പെടുകയാണ്.',
    hi: 'धन्यवाद, मैं अभी निकल रहा हूँ।',
    patterns: [/on my way/i, /പുറപ്പെടുകയാണ്/, /निकल रहा/],
  },
];

export async function translateChatMessage(params: {
  text: string;
  targetLanguage: LanguageCode;
}): Promise<{
  detectedLanguage: LanguageCode;
  translatedText: string;
  usedFallback: boolean;
}> {
  const detectedLanguage = detectScriptLanguage(params.text);
  if (detectedLanguage === params.targetLanguage) {
    return {
      detectedLanguage,
      translatedText: params.text,
      usedFallback: false,
    };
  }

  const ai = getAiClient();
  const langNames: Record<LanguageCode, string> = {
    en: 'English',
    ml: 'Malayalam',
    hi: 'Hindi',
  };

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents:
          `Translate this customer-provider marketplace message accurately into ${langNames[params.targetLanguage]}.\n` +
          `CRITICAL RULES:\n` +
          `- Preserve all numbers, Indian Rupee prices (₹), dates, times, PIN codes, and addresses EXACTLY without modification.\n` +
          `- Return JSON with detectedLanguage ("en" | "ml" | "hi") and translatedText.\n\n` +
          `Message: "${params.text}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedLanguage: { type: Type.STRING },
              translatedText: { type: Type.STRING },
            },
          },
        },
      });
      const parsed = JSON.parse((response.text || '{}').trim()) as {
        detectedLanguage?: LanguageCode;
        translatedText?: string;
      };
      if (parsed.translatedText?.trim()) {
        return {
          detectedLanguage:
            parsed.detectedLanguage === 'ml' ||
            parsed.detectedLanguage === 'hi' ||
            parsed.detectedLanguage === 'en'
              ? parsed.detectedLanguage
              : detectedLanguage,
          translatedText: parsed.translatedText.trim(),
          usedFallback: false,
        };
      }
    } catch (err) {
      console.error('Gemini translation error:', err);
    }
  }

  // Deterministic glossary / script-preserving fallback
  const matched = PHRASE_GLOSSARY.find((item) => item.patterns.some((p) => p.test(params.text)));
  if (matched) {
    return {
      detectedLanguage,
      translatedText: matched[params.targetLanguage],
      usedFallback: true,
    };
  }

  const label = langNames[params.targetLanguage];
  return {
    detectedLanguage,
    translatedText: `[${label} translation preview — configure GEMINI_API_KEY for full neural translation]: ${params.text}`,
    usedFallback: true,
  };
}

