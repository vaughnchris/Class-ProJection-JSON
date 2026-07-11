import JSZip from 'jszip';

/**
 * Parses a Canvas QTI .zip file (supports QTI 1.2 and QTI 2.1) and extracts multiple-choice/true-false questions.
 * @param {File} file The QTI .zip file
 * @returns {Promise<Array>} Array of parsed questions
 */
export const parseQtiZip = async (file) => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  const questions = [];
  const parser = new DOMParser();

  // Find all XML files in the zip
  const xmlFiles = [];
  for (const relativePath in loadedZip.files) {
    if (!loadedZip.files[relativePath].dir && relativePath.endsWith('.xml')) {
      xmlFiles.push(relativePath);
    }
  }

  // Parse each XML file
  for (const filePath of xmlFiles) {
    try {
      const content = await loadedZip.files[filePath].async("string");
      const xmlDoc = parser.parseFromString(content, "application/xml");
      const root = xmlDoc.documentElement;

      // QTI 2.1 Item File
      if (root.localName === 'assessmentItem') {
        const q = parseQti21Item(xmlDoc);
        if (q) questions.push(q);
      }
      // QTI 1.2 Assessment File (contains multiple items)
      else if (root.localName === 'questestinterop' || xmlDoc.querySelector('item')) {
        const qs = parseQti12Items(xmlDoc);
        questions.push(...qs);
      }
    } catch (err) {
      console.warn(`Failed to parse XML file: ${filePath}`, err);
    }
  }

  // Deduplicate questions by ID
  const uniqueQuestions = [];
  const seenIds = new Set();
  for (const q of questions) {
    if (!seenIds.has(q.id)) {
      seenIds.add(q.id);
      uniqueQuestions.push(q);
    }
  }

  if (uniqueQuestions.length === 0) {
    throw new Error("Could not find any supported multiple-choice questions in the zip. Ensure it is a valid QTI export.");
  }

  return uniqueQuestions;
};

/**
 * Parses a single QTI 2.1 <assessmentItem> XML Document.
 */
const parseQti21Item = (xmlDoc) => {
  try {
    const root = xmlDoc.documentElement;
    const id = root.getAttribute('identifier') || 'unknown';
    const title = root.getAttribute('title') || 'Untitled Question';

    // Extract Prompt
    const itemBody = xmlDoc.querySelector('itemBody');
    let promptHtml = "";
    if (itemBody) {
      const promptNodes = Array.from(itemBody.childNodes).filter(node => node.localName !== 'choiceInteraction');
      promptHtml = promptNodes.map(n => {
        if (n.nodeType === 1) return n.outerHTML; // Element
        if (n.nodeType === 3) return n.textContent; // TextNode
        return '';
      }).join('').trim();
    }

    // Extract Choices
    const choices = [];
    const choiceElements = xmlDoc.querySelectorAll('choiceInteraction simpleChoice');
    choiceElements.forEach(choice => {
      choices.push({
        id: choice.getAttribute('identifier'),
        textHtml: choice.innerHTML
      });
    });

    // Extract Correct Answer
    let correctId = null;
    const correctResponse = xmlDoc.querySelector('responseDeclaration correctResponse value');
    if (correctResponse) {
      correctId = correctResponse.textContent.trim();
    }

    if (choices.length > 0 && correctId) {
      return { id, title, promptHtml, choices, correctId };
    }
  } catch (err) {
    console.warn("Failed to parse QTI 2.1 item", err);
  }
  return null;
};

/**
 * Parses a QTI 1.2 XML Document containing multiple <item>s.
 */
const parseQti12Items = (xmlDoc) => {
  const items = xmlDoc.querySelectorAll('item');
  const questions = [];

  items.forEach((item, index) => {
    try {
      const id = item.getAttribute('ident') || `q_${index}`;
      const title = item.getAttribute('title') || `Question ${index + 1}`;
      
      const presentationMaterial = item.querySelector('presentation > material > mattext');
      const promptHtml = presentationMaterial ? presentationMaterial.textContent : "No prompt provided.";

      const renderChoices = item.querySelectorAll('response_lid > render_choice > response_label');
      const choices = [];
      renderChoices.forEach(choice => {
        const choiceId = choice.getAttribute('ident');
        const choiceMaterial = choice.querySelector('material > mattext');
        const choiceTextHtml = choiceMaterial ? choiceMaterial.textContent : "";
        choices.push({ id: choiceId, textHtml: choiceTextHtml });
      });

      let correctId = null;
      const respconditions = item.querySelectorAll('resprocessing > respcondition');
      respconditions.forEach(condition => {
        const setvar = condition.querySelector('setvar');
        if (setvar && setvar.textContent.trim() === "100") {
          const varequal = condition.querySelector('conditionvar > varequal');
          if (varequal) {
            correctId = varequal.textContent.trim();
          }
        }
      });

      if (choices.length > 0 && correctId) {
        questions.push({ id, title, promptHtml, choices, correctId });
      }
    } catch (err) {
      console.warn("Skipping a QTI 1.2 item due to parsing error", err);
    }
  });

  return questions;
};
