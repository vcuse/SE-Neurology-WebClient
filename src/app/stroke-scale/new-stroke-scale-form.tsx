"use client";
//library imports 
import React, { useEffect, useState } from "react";
//custom imports 
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Minimize2 } from "lucide-react";

//===================================
// INTERFACES AND TYPE DEFENITIONS
//===================================

interface NewStrokeScaleFormProps { // defines props for the form
  onMinimize?: () => void;
  onCancel?: () => void;
  initialData?: StrokeScaleFormData;
  onDataChange?: (formData: StrokeScaleFormData) => void; // uses updated form data as argument
  onPatientChange?: (name: string, DOB: string) => void;
  initialPatient?: { name: string, DOB: string };
}

type StrokeScaleFormData = { [key: number]: number }; // maps question index to score

type Option = {
  title: string;
  score: number;
};

type StrokeScaleQuestion = {
  id: number;
  questionHeader: string;
  subHeader?: string | null;
  options: Option[];
};

//===================================
// MAIN COMPONENT
//===================================

export default function NewStrokeScaleForm({
  onMinimize,
  onCancel,
  initialData = {}, // initially empty
  onDataChange,
  onPatientChange,
  initialPatient = { name: '', DOB: '' }
}: NewStrokeScaleFormProps) {

  // tracks options selected 
  const [selectedOptions, setSelectedOptions] = useState<(number | null)[]>( // stores index of selected answers
    strokeScaleQuestions.map((_, index) => { // checks for prefilled answers
      return initialData[index] !== undefined ? initialData[index] : null; // if a prefilled answer exists, use it, else set to null
    })
  );

  const [patientName, setPatientName] = useState(initialPatient.name);
  const [dob, setDob] = useState(initialPatient.DOB);
  const [message, setMessage] = useState<string | null>(null);

  // when data changes, calculate score
  useEffect(() => {
    if (onDataChange) {
      const formData: StrokeScaleFormData = {};
      selectedOptions.forEach((option, index) => { // loop through selected options 
        if (option !== null) { // skip not selected options
          formData[index] = strokeScaleQuestions[index].options[option].score; // store score into formdata 
        }
      });
      onDataChange(formData); // pass updated data 
    }
  }, [selectedOptions, onDataChange]);

  // handle name change
  const handleNameChange = (newWame: string) => {
    setPatientName(newWame);
    onPatientChange?.(newWame, dob);
  }

  // handle DOB change
  const handleDOBChange = (newDOB: string) => {
    setDob(newDOB);
    onPatientChange?.(patientName, newDOB);
  }

  // handle saving the form
  const handleSave = async () => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

    const today = formatter.format(new Date());
    const dobFormatted = dob;
    const username = localStorage.getItem("username") ?? "unknown"; // get username if it exists else use unknown

    // builds a string of scores
    const resultsString = selectedOptions
      .map((index, qIdx) => {
        if (index === null) return "9"; // return 9 if unanswered 
        const score = strokeScaleQuestions[qIdx].options[index]?.score; // retrieve the score 
        return score !== undefined ? String(score) : "9"; // convert score to string, or 9 if unanswered 
      })
      .join(""); // join all scores into one string


    // object to send to the server
    const payload = {
      patientName,
      DOB: dobFormatted,
      formDate: today,
      results: resultsString,
      username,
    };

    // sends payload to the server
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_SERVER_FETCH_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Action": "submitStrokeScale",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // SUCCESS: Just go back
        onCancel?.();
      } else {
        // FAILURE: Show error
        alert("Error saving form. Please try again.");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving form.");
      onCancel?.(); // still allow cancel
    }
  };

  // function to update the option when clicked on
  const handleOptionSelect = (questionIndex: number, optionIndex: number) => {
    const updated = [...selectedOptions]; // copy current selected options
    updated[questionIndex] = optionIndex; // update the index
    setSelectedOptions(updated); // apply
  }


  //===================================
  // COMPONENT RENDER
  //===================================

  return (
    // main container card
    <Card className="border-blue-50 max-w-3xl mx-auto flex flex-col h-[calc(100vh-150px)]">
      {/* Top sticky header */}
      <CardHeader className="sticky top-0 z-10 border-b border-blue-50 bg-white">
        {/* form title */}
        <CardTitle className="text-center text-blue-900 text-lg">
          New NIH Stroke Scale Form
        </CardTitle>

        {onMinimize && (
          <div className="absolute top-4 right-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onMinimize}
              className="border-blue-200 text-blue-900 hover:bg-blue-50"
              title="Minimize"
            >
              <Minimize2 className="h-4 w-4"></Minimize2>
            </Button>
          </div>
        )}

        {/* patient info section */}
        <div className="flex flex-col gap-3 mt-4">
          {/* patient name input field */}
          <input
            type="text"
            placeholder="Patient Name"
            value={patientName}
            className="w-full rounded-md border px-3 py-2 text-sm border-gray-300"
            onChange={(e) => handleNameChange(e.target.value)}
          />
          {/* patient birth date input field */}
          <input
            type="text"
            placeholder="Patient DOB (MM/DD/YYYY)"
            value={dob}
            onChange={(e) => handleDOBChange(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm border-gray-300"
          />
          {/* current date */}
          <p className="text-sm text-gray-500 text-center">
            Date: {new Date().toLocaleDateString("en-US")}
          </p>
        </div>
      </CardHeader>

      {/* Scrollable questions */}
      <CardContent className="flex-1 overflow-y-auto bg-gray-50 p-4">
        <div className="space-y-6">
          {/* question mappings to create question cards */}
          {strokeScaleQuestions.map((question, index) => {
            const selectedOption = selectedOptions[index]; // get currently selected question

            return (
              // question container
              <div key={question.id} className="bg-purple-200 p-4 rounded-md">
                {/* question header */}
                <h3 className="font-semibold text-blue-900">
                  {question.questionHeader}
                </h3>

                {question.subHeader && (
                  <p className="text-sm text-gray-700 mb-2">{question.subHeader}</p>
                )}

                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selectedOption === optionIndex; // check if option is selected 

                    return (
                      <button
                        key={optionIndex}
                        onClick={() => {
                          const updated = [...selectedOptions]; // store copy of current selected
                          updated[index] = optionIndex;
                          setSelectedOptions(updated); // update state with new selection
                        }}
                        className={cn(
                          // button style
                          "w-full flex justify-between items-center px-4 py-2 rounded border transition-colors text-left",
                          // button style after selected 
                          isSelected
                            ? "bg-purple-400 text-white border-purple-500"
                            : "bg-white text-black border-gray-200 hover:bg-purple-100"
                        )}
                      >
                        {/* option text */}
                        <span>{option.title}</span>
                        {/* display '+' and score */}
                        <span className="text-sm">
                          {option.score >= 0 ? `+${option.score}` : option.score}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Bottom sticky save/cancel */}
      <div className="sticky bottom-0 bg-white border-t border-blue-50 flex justify-center gap-4 p-4">
        <Button className="bg-green-600 text-white hover:bg-green-700" onClick={handleSave}>Save</Button>
        <Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => onCancel?.()}>Cancel</Button>
      </div>
    </Card>
  );
}

//===================================
// QUESTIONS
//===================================

export const strokeScaleQuestions = [
  {
    id: 0,
    questionHeader: "1A: Level of Consciousness",
    subHeader: "May be assessed casually while taking history",
    options: [
      { title: "Alert; keenly responsive", score: 0 },
      { title: "Arouses to minor stimulation", score: 1 },
      { title: "Requires repeated stimulation to arouse", score: 2 },
      { title: "Movements to pain", score: 2 },
      { title: "Postures or unresponsive", score: 3 }
    ]
  },
  {
    id: 1,
    questionHeader: "1B: Ask month and age",
    subHeader: null,
    options: [
      { title: "Both questions right", score: 0 },
      { title: "1 question right", score: 1 },
      { title: "0 questions right", score: 2 },
      { title: "Dysarthric/intubated/trauma/language barrier", score: 1 },
      { title: "Aphasic", score: 2 }
    ]
  },
  {
    id: 2,
    questionHeader: "1C: 'Blink eyes' & 'Squeeze hands'",
    subHeader: "Pantomime commands if communication barrier",
    options: [
      { title: "Performs both tasks", score: 0 },
      { title: "Performs 1 task", score: 1 },
      { title: "Performs 0 tasks", score: 2 }
    ]
  },
  {
    id: 3,
    questionHeader: "2: Horizontal extraocular movements",
    subHeader: "Only assess horizontal gaze",
    options: [
      { title: "Normal", score: 0 },
      { title: "Partial gaze palsy: can be overcome", score: 1 },
      { title: "Partial gaze palsy: corrects with oculocephalic reflex", score: 1 },
      { title: "Forced gaze palsy: cannot be overcome", score: 2 }
    ]
  },
  {
    id: 4,
    questionHeader: "3: Visual Fields",
    subHeader: null,
    options: [
      { title: "No visual loss", score: 0 },
      { title: "Partial hemianopia", score: 1 },
      { title: "Complete hemianopia", score: 2 },
      { title: "Patient is bilaterally blind", score: 3 },
      { title: "Bilateral hemianopia", score: 3 }
    ]
  },
  {
    id: 5,
    questionHeader: "4: Facial Palsy",
    subHeader: "Use grimace if obtunded",
    options: [
      { title: "Normal symmetry", score: 0 },
      { title: "Minor paralysis (flat nasolabial fold, smile asymmetry)", score: 1 },
      { title: "Partial paralysis (lower face)", score: 2 },
      { title: "Unilateral complete paralysis (upper/lower face)", score: 3 },
      { title: "Bilateral complete paralysis (upper/lower face)", score: 3 }
    ]
  },
  {
    id: 6,
    questionHeader: "5A: Left arm motor drift",
    subHeader: "Count out loud and use your fingers to show the patient your count",
    options: [
      { title: "No drift for 10 seconds", score: 0 },
      { title: "Drift, but doesn't hit bed", score: 1 },
      { title: "Drift, hits bed", score: 2 },
      { title: "Some effort against gravity", score: 2 },
      { title: "No effort against gravity", score: 3 },
      { title: "No movement", score: 4 },
      { title: "Amputation/joint fusion", score: 0 }
    ]
  },
  {
    id: 7,
    questionHeader: "5B: Right arm motor drift",
    subHeader: "Count out loud and use your fingers to show the patient your count",
    options: [
      { title: "No drift for 10 seconds", score: 0 },
      { title: "Drift, but doesn't hit bed", score: 1 },
      { title: "Drift, hits bed", score: 2 },
      { title: "Some effort against gravity", score: 2 },
      { title: "No effort against gravity", score: 3 },
      { title: "No movement", score: 4 },
      { title: "Amputation/joint fusion", score: 0 }
    ]
  },
  {
    id: 8,
    questionHeader: "6A: Left leg motor drift",
    subHeader: "Count out loud and use your fingers to show the patient your count",
    options: [
      { title: "No drift for 5 seconds", score: 0 },
      { title: "Drift, but doesn't hit bed", score: 1 },
      { title: "Drift, hits bed", score: 2 },
      { title: "Some effort against gravity", score: 2 },
      { title: "No effort against gravity", score: 3 },
      { title: "No movement", score: 4 },
      { title: "Amputation/joint fusion", score: 0 }
    ]
  },
  {
    id: 9,
    questionHeader: "6B: Right leg motor drift",
    subHeader: "Count out loud and use your fingers to show the patient your count",
    options: [
      { title: "No drift for 5 seconds", score: 0 },
      { title: "Drift, but doesn't hit bed", score: 1 },
      { title: "Drift, hits bed", score: 2 },
      { title: "Some effort against gravity", score: 2 },
      { title: "No effort against gravity", score: 3 },
      { title: "No movement", score: 4 },
      { title: "Amputation/joint fusion", score: 0 }
    ]
  },
  {
    id: 10,
    questionHeader: "7: Limb Ataxia",
    subHeader: "FNF/heel-shin",
    options: [
      { title: "No ataxia", score: 0 },
      { title: "Ataxia in 1 limb", score: 1 },
      { title: "Ataxia in 2 limbs", score: 2 },
      { title: "Does not understand", score: 0 },
      { title: "Paralyzed", score: 0 },
      { title: "Amputation/joint fusion", score: 0 }
    ]
  },
  {
    id: 11,
    questionHeader: "8: Sensation",
    subHeader: null,
    options: [
      { title: "Normal; no sensory loss", score: 0 },
      { title: "Mild-moderate loss: less sharp/more dull", score: 1 },
      { title: "Mild/moderate loss: can sense being touched", score: 1 },
      { title: "Complete loss: cannot sense being touched at all", score: 2 },
      { title: "No response and quadriplegic", score: 2 },
      { title: "Coma/unresponsive", score: 2 }
    ]
  },
  {
    id: 12,
    questionHeader: "9: Language/Aphasia",
    subHeader: "Describe the scene; name the items; read the sentences",
    options: [
      { title: "Normal; no aphasia", score: 0 },
      { title: "Mild-moderate aphasia: some obvious changes, without significant limitation", score: 1 },
      { title: "Severe aphasia: fragmentary expression, inference needed, cannot identify materials", score: 2 },
      { title: "Mute/global aphasia: no usable speech/auditory comprehension", score: 3 },
      { title: "Coma/unresponsive", score: 3 }
    ]
  },
  {
    id: 13,
    questionHeader: "10: Dysarthria",
    subHeader: "Read the words",
    options: [
      { title: "Normal", score: 0 },
      { title: "Mild-moderate dysarthria: slurring but can be understood", score: 1 },
      { title: "Severe dysarthria: unintelligible slurring or out of proportion to dysphasia", score: 2 },
      { title: "Mute/anarthric", score: 2 },
      { title: "Intubated/unable to test", score: 0 }
    ]
  },
  {
    id: 14,
    questionHeader: "11: Extinction/Inattention",
    subHeader: null,
    options: [
      { title: "No abnormality", score: 0 },
      { title: "Visual/tactile/auditory/spatial/personal inattention", score: 1 },
      { title: "Extinction to bilateral simultaneous stimulation", score: 1 },
      { title: "Profound hemi-inattention", score: 2 },
      { title: "Extinction to >1 modality", score: 2 }
    ]
  }
];

