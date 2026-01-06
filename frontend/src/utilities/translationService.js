/**
 * Translation Service
 * Wrapper around Amazon Translate API for real-time translation
 */

import axios from 'axios';
import { DOCUMENTS_API } from './constants';
import { getIdToken } from './auth';

const TRANSLATE_API = `${DOCUMENTS_API}translate`;
const TRANSLATE_BATCH_API = `${DOCUMENTS_API}translate-batch`;

// Cache for translated texts to reduce API calls
const translationCache = new Map();

/**
 * Generate cache key for a translation
 */
function getCacheKey(text, sourceLang, targetLang) {
  return `${sourceLang}-${targetLang}:${text}`;
}

/**
 * Translate a single text using Amazon Translate
 *
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language code (en, es)
 * @param {string} targetLang - Target language code (en, es)
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, sourceLang = 'en', targetLang = 'es') {
  try {
    // Check cache first
    const cacheKey = getCacheKey(text, sourceLang, targetLang);
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey);
    }

    // If same language, return original
    if (sourceLang === targetLang) {
      return text;
    }

    const token = await getIdToken();
    const response = await axios.post(
      TRANSLATE_API,
      {
        text,
        source_language: sourceLang,
        target_language: targetLang,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const translatedText = response.data.translated_text;

    // Cache the translation
    translationCache.set(cacheKey, translatedText);

    return translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    // Fallback to original text on error
    return text;
  }
}

/**
 * Translate multiple texts in a single batch request
 * More efficient than multiple individual requests
 *
 * @param {string[]} texts - Array of texts to translate
 * @param {string} sourceLang - Source language code (en, es)
 * @param {string} targetLang - Target language code (en, es)
 * @returns {Promise<Array<{original: string, translated: string}>>} Array of translation results
 */
export async function translateBatch(texts, sourceLang = 'en', targetLang = 'es') {
  try {
    // If same language, return originals
    if (sourceLang === targetLang) {
      return texts.map(text => ({ original: text, translated: text }));
    }

    // Check cache for each text
    const results = [];
    const textsToTranslate = [];
    const indicesToTranslate = [];

    texts.forEach((text, index) => {
      const cacheKey = getCacheKey(text, sourceLang, targetLang);
      if (translationCache.has(cacheKey)) {
        results[index] = {
          original: text,
          translated: translationCache.get(cacheKey),
        };
      } else {
        textsToTranslate.push(text);
        indicesToTranslate.push(index);
      }
    });

    // If all texts are cached, return immediately
    if (textsToTranslate.length === 0) {
      return results;
    }

    const token = await getIdToken();
    const response = await axios.post(
      TRANSLATE_BATCH_API,
      {
        texts: textsToTranslate,
        source_language: sourceLang,
        target_language: targetLang,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const translations = response.data.translations;

    // Cache and store results
    translations.forEach((translation, i) => {
      const originalText = translation.original;
      const translatedText = translation.translated;
      const originalIndex = indicesToTranslate[i];

      // Cache the translation
      const cacheKey = getCacheKey(originalText, sourceLang, targetLang);
      translationCache.set(cacheKey, translatedText);

      results[originalIndex] = translation;
    });

    return results;
  } catch (error) {
    console.error('Batch translation error:', error);
    // Fallback to original texts on error
    return texts.map(text => ({ original: text, translated: text }));
  }
}

/**
 * Clear the translation cache
 * Useful when switching languages or when cache grows too large
 */
export function clearTranslationCache() {
  translationCache.clear();
}

/**
 * Get cache size (for debugging)
 */
export function getTranslationCacheSize() {
  return translationCache.size;
}

/**
 * Helper to translate recommendations content
 * Translates quick actions, suggested topics, and recent updates
 *
 * @param {object} recommendations - Recommendations object
 * @param {string} targetLang - Target language (en or es)
 * @returns {Promise<object>} Translated recommendations
 */
export async function translateRecommendations(recommendations, targetLang = 'es') {
  if (!recommendations) return recommendations;

  try {
    // Collect all texts to translate
    const textsToTranslate = [];

    // Quick actions
    if (recommendations.quick_actions) {
      recommendations.quick_actions.forEach(action => {
        textsToTranslate.push(action.title);
        textsToTranslate.push(action.description);
        if (action.queries) {
          textsToTranslate.push(...action.queries);
        }
      });
    }

    // Suggested topics
    if (recommendations.suggested_topics) {
      textsToTranslate.push(...recommendations.suggested_topics);
    }

    // Recent updates
    if (recommendations.recent_updates) {
      textsToTranslate.push(...recommendations.recent_updates);
    }

    // Translate all at once
    const translations = await translateBatch(textsToTranslate, 'en', targetLang);

    // Reconstruct recommendations with translations
    let translationIndex = 0;
    const translatedRecommendations = { ...recommendations };

    if (translatedRecommendations.quick_actions) {
      translatedRecommendations.quick_actions = translatedRecommendations.quick_actions.map(action => {
        const translatedAction = {
          ...action,
          title: translations[translationIndex++].translated,
          description: translations[translationIndex++].translated,
        };

        if (action.queries) {
          translatedAction.queries = action.queries.map(() =>
            translations[translationIndex++].translated
          );
        }

        return translatedAction;
      });
    }

    if (translatedRecommendations.suggested_topics) {
      translatedRecommendations.suggested_topics = translatedRecommendations.suggested_topics.map(
        () => translations[translationIndex++].translated
      );
    }

    if (translatedRecommendations.recent_updates) {
      translatedRecommendations.recent_updates = translatedRecommendations.recent_updates.map(
        () => translations[translationIndex++].translated
      );
    }

    return translatedRecommendations;
  } catch (error) {
    console.error('Error translating recommendations:', error);
    return recommendations; // Return original on error
  }
}
