/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Docssearchfailed2Inputs */

const en_docssearchfailed2 = /** @type {(inputs: Docssearchfailed2Inputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Search couldn't load.`)
};

/** @type {(inputs: Docssearchfailed2Inputs) => LocalizedString} */
const es_docssearchfailed2 = en_docssearchfailed2;

/** @type {(inputs: Docssearchfailed2Inputs) => LocalizedString} */
const zh_docssearchfailed2 = en_docssearchfailed2;

/** @type {(inputs: Docssearchfailed2Inputs) => LocalizedString} */
const ja_docssearchfailed2 = en_docssearchfailed2;

/** @type {(inputs: Docssearchfailed2Inputs) => LocalizedString} */
const ko_docssearchfailed2 = en_docssearchfailed2;

/** @type {(inputs: Docssearchfailed2Inputs) => LocalizedString} */
const zh_hant1_docssearchfailed2 = zh_docssearchfailed2;

/** @type {(inputs: Docssearchfailed2Inputs) => LocalizedString} */
const de_docssearchfailed2 = en_docssearchfailed2;

/** @type {(inputs: Docssearchfailed2Inputs) => LocalizedString} */
const fr_docssearchfailed2 = en_docssearchfailed2;

/** @type {(inputs: Docssearchfailed2Inputs) => LocalizedString} */
const uk_docssearchfailed2 = en_docssearchfailed2;

/**
* | output |
* | --- |
* | "Search couldn't load." |
*
* @param {Docssearchfailed2Inputs} inputs
* @param {{ locale?: "en" | "es" | "zh" | "ja" | "ko" | "zh-Hant" | "de" | "fr" | "uk" }} options
* @returns {LocalizedString}
*/
const docssearchfailed2 = /** @type {((inputs?: Docssearchfailed2Inputs, options?: { locale?: "en" | "es" | "zh" | "ja" | "ko" | "zh-Hant" | "de" | "fr" | "uk" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Docssearchfailed2Inputs, { locale?: "en" | "es" | "zh" | "ja" | "ko" | "zh-Hant" | "de" | "fr" | "uk" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return es_docssearchfailed2(inputs)
	if (locale === "zh") return zh_docssearchfailed2(inputs)
	if (locale === "ja") return ja_docssearchfailed2(inputs)
	if (locale === "ko") return ko_docssearchfailed2(inputs)
	if (locale === "zh-Hant") return zh_hant1_docssearchfailed2(inputs)
	if (locale === "de") return de_docssearchfailed2(inputs)
	if (locale === "fr") return fr_docssearchfailed2(inputs)
	if (locale === "uk") return uk_docssearchfailed2(inputs)
	return en_docssearchfailed2(inputs)
});
export { docssearchfailed2 as "docsSearchFailed" }