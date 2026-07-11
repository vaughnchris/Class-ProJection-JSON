import JSZip from 'jszip';

/**
 * Parses a Canvas QTI .zip file and extracts multiple-choice/true-false questions.
 * @param {File} file The QTI .zip file
 * @returns {Promise<Array>} Array of parsed questions
 */
export const parseQtiZip = async (file) => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  
  let assessmentXmlContent = null;

  // Find the primary assessment XML file (usually ends with assessment.xml or is inside a non_cc_assessments folder)
  for (const relativePath in loadedZip.files) {
    if (!loadedZip.files[relativePath].dir && relativePath.endsWith('assessment.xml')) {
      assessmentXmlContent = await loadedZip.files[relativePath].async("string");
      break;
    }
  }

  // Fallback: If no assessment.xml, just find any xml that contains <questestinterop>
  if (!assessmentXmlContent) {
    for (const relativePath in loadedZip.files) {
      if (!loadedZip.files[relativePath].dir && relativePath.endsWith('.xml')) {
        const content = await loadedZip.files[relativePath].async("string");
        if (content.includes('<questestinterop')) {
          assessmentXmlContent = content;
          break;
        }
      }
    }
  }

  if (!assessmentXmlContent) {
    throw new Error("Could not find a valid QTI assessment XML file in the zip.");
  }

  return parseQtiXml(assessmentXmlContent);
};

/**
 * Parses the QTI XML string and extracts items.
 */
const parseQtiXml = (xmlString) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");
  
  const items = xmlDoc.querySelectorAll('item');
  const questions = [];

  items.forEach((item, index) => {
    try {
      // 1. Get Ident and Title
      const id = item.getAttribute('ident') || `q_${index}`;
      const title = item.getAttribute('title') || `Question ${index + 1}`;
      
      // 2. Get Prompt
      const presentationMaterial = item.querySelector('presentation > material > mattext');
      const promptHtml = presentationMaterial ? presentationMaterial.textContent : "No prompt provided.";

      // 3. Get Choices
      const renderChoices = item.querySelectorAll('response_lid > render_choice > response_label');
      const choices = [];
      renderChoices.forEach(choice => {
        const choiceId = choice.getAttribute('ident');
        const choiceMaterial = choice.querySelector('material > mattext');
        const choiceTextHtml = choiceMaterial ? choiceMaterial.textContent : "";
        choices.push({ id: choiceId, textHtml: choiceTextHtml });
      });

      // 4. Get Correct Answer ID
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

      // Only add if it's a standard multiple choice/TF question (has choices and a correct answer)
      if (choices.length > 0 && correctId) {
        questions.push({
          id,
          title,
          promptHtml,
          choices,
          correctId
        });
      }
    } catch (err) {
      console.warn("Skipping an item due to parsing error", err);
    }
  });

  return questions;
};
