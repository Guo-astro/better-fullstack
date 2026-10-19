/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Docssearchretry2Inputs */

const en_docssearchretry2 = /** @type {(inputs: Docssearchretry2Inputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Try again`)
};

/** @type {(inputs: Docssearchretry2Inputs) => LocalizedString} */
const es_docssearchretry2 = en_docssearchretry2;

/** @type {(inputs: Docssearchretry2Inputs) => LocalizedString} */
const zh_docssearchretry2 = en_docssearchretry2;

/** @type {(inputs: Docssearchretry2Inputs) => LocalizedString} */
const ja_docssearchretry2 = en_docssearchretry2;

/** @type {(inputs: Docssearchretry2Inputs) => LocalizedString} */
const ko_docssearchretry2 = en_docssearchretry2;

/** @type {(inputs: Docssearchretry2Inputs) => LocalizedString} */
const zh_hant1_docssearchretry2 = zh_docssearchretry2;

/** @type {(inputs: Docssearchretry2Inputs) => LocalizedString} */
const de_docssearchretry2 = en_docssearchretry2;

/** @type {(inputs: Docssearchretry2Inputs) => LocalizedString} */
const fr_docssearchretry2 = en_docssearchretry2;

/** @type {(inputs: Docssearchretry2Inputs) => LocalizedString} */
const uk_docssearchretry2 = en_docssearchretry2;

/**
* | output |
* | --- |
* | "Try again" |
*
* @param {Docssearchretry2Inputs} inputs
* @param {{ locale?: "en" | "es" | "zh" | "ja" | "ko" | "zh-Hant" | "de" | "fr" | "uk" }} options
* @returns {LocalizedString}
*/
const docssearchretry2 = /** @type {((inputs?: Docssearchretry2Inputs, options?: { locale?: "en" | "es" | "zh" | "ja" | "ko" | "zh-Hant" | "de" | "fr" | "uk" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Docssearchretry2Inputs, { locale?: "en" | "es" | "zh" | "ja" | "ko" | "zh-Hant" | "de" | "fr" | "uk" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return es_docssearchretry2(inputs)
	if (locale === "zh") return zh_docssearchretry2(inputs)
	if (locale === "ja") return ja_docssearchretry2(inputs)
	if (locale === "ko") return ko_docssearchretry2(inputs)
	if (locale === "zh-Hant") return zh_hant1_docssearchretry2(inputs)
	if (locale === "de") return de_docssearchretry2(inputs)
	if (locale === "fr") return fr_docssearchretry2(inputs)
	if (locale === "uk") return uk_docssearchretry2(inputs)
	return en_docssearchretry2(inputs)
});
export { docssearchretry2 as "docsSearchRetry" }