"use client"

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface StrokeScaleFormProps {
  onClose: () => void;
}

interface Question {
  id: number;
  text: string;
  options: string[];
}

interface FormData {
  [key: number]: number;
}

const StrokeScaleForm: React.FC<StrokeScaleFormProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});

  const questions: Question[] = [
    {
      id: 1,
      text: "1a. Level of Consciousness",
      options: [
        "0 = Alert; keenly responsive",
        "1 = Not alert; but arousable by minor stimulation",
        "2 = Not alert; requires repeated stimulation",
        "3 = Unresponsive; reflex movements only"
      ]
    },
    {
      id: 2,
      text: "1b. LOC Questions",
      options: [
        "0 = Answers both questions correctly",
        "1 = Answers one question correctly",
        "2 = Answers neither question correctly"
      ]
    },
    {
      id: 3,
      text: "1c. LOC Commands",
      options: [
        "0 = Performs both tasks correctly",
        "1 = Performs one task correctly",
        "2 = Performs neither task correctly"
      ]
    },
    {
      id: 4,
      text: "2. Best Gaze",
      options: [
        "0 = Normal",
        "1 = Partial gaze palsy",
        "2 = Forced deviation"
      ]
    },
    {
      id: 5,
      text: "3. Visual",
      options: [
        "0 = No visual loss",
        "1 = Partial hemianopia",
        "2 = Complete hemianopia",
        "3 = Bilateral hemianopia"
      ]
    },
    {
      id: 6,
      text: "4. Facial Palsy",
      options: [
        "0 = Normal symmetric movements",
        "1 = Minor paralysis",
        "2 = Partial paralysis",
        "3 = Complete paralysis"
      ]
    },
    {
      id: 7,
      text: "5a. Motor Arm - Left",
      options: [
        "0 = No drift",
        "1 = Drift",
        "2 = Some effort against gravity",
        "3 = No effort against gravity",
        "4 = No movement",
        "UN = Amputation or joint fusion"
      ]
    },
    {
      id: 8,
      text: "5b. Motor Arm - Right",
      options: [
        "0 = No drift",
        "1 = Drift",
        "2 = Some effort against gravity",
        "3 = No effort against gravity",
        "4 = No movement",
        "UN = Amputation or joint fusion"
      ]
    },
    {
      id: 9,
      text: "6a. Motor Leg - Left",
      options: [
        "0 = No drift",
        "1 = Drift",
        "2 = Some effort against gravity",
        "3 = No effort against gravity",
        "4 = No movement",
        "UN = Amputation or joint fusion"
      ]
    },
    {
      id: 10,
      text: "6b. Motor Leg - Right",
      options: [
        "0 = No drift",
        "1 = Drift",
        "2 = Some effort against gravity",
        "3 = No effort against gravity",
        "4 = No movement",
        "UN = Amputation or joint fusion"
      ]
    },
    {
      id: 11,
      text: "7. Limb Ataxia",
      options: [
        "0 = Absent",
        "1 = Present in one limb",
        "2 = Present in two limbs"
      ]
    },
    {
      id: 12,
      text: "8. Sensory",
      options: [
        "0 = Normal",
        "1 = Mild-to-moderate loss",
        "2 = Severe to total loss"
      ]
    },
    {
      id: 13,
      text: "9. Best Language",
      options: [
        "0 = No aphasia",
        "1 = Mild-to-moderate aphasia",
        "2 = Severe aphasia",
        "3 = Mute, global aphasia"
      ]
    },
    {
      id: 14,
      text: "10. Dysarthria",
      options: [
        "0 = Normal",
        "1 = Mild-to-moderate",
        "2 = Severe",
        "UN = Intubated or other physical barrier"
      ]
    },
    {
      id: 15,
      text: "11. Extinction and Inattention",
      options: [
        "0 = No abnormality",
        "1 = Visual, tactile, auditory, spatial, or personal inattention",
        "2 = Profound hemi-inattention or extinction"
      ]
    }
  ];

  const handleOptionSelect = (questionId: number, optionIndex: number) => {
    setFormData(prevData => ({
      ...prevData,
      [questionId]: optionIndex
    }));
    
    const question = questions.find(q => q.id === questionId);
    if (question && questions.indexOf(question) < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const renderQuestion = ({ question, selectedOption }: { question: Question; selectedOption: number | undefined }) => {
    return (
      <div key={question.id} className="space-y-4">
        <h3 className="text-lg font-semibold">{question.text}</h3>
        <div className="space-y-2">
          {question.options.map((option: string, index: number) => (
            <Button
              key={index}
              variant={selectedOption === index ? "default" : "outline"}
              className="w-full justify-start text-left"
              onClick={() => handleOptionSelect(question.id, index)}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const calculateScore = () => {
    let totalScore = 0;
    Object.entries(formData).forEach(([questionId, score]) => {
      if (typeof score === 'number' && !isNaN(score)) {
        totalScore += score;
      }
    });
    return totalScore;
  };

  return (
    <Card className="w-full max-w-2xl p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">NIH Stroke Scale Assessment</h2>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>

      {renderQuestion({
        question: questions[currentStep],
        selectedOption: formData[questions[currentStep].id]
      })}

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
        >
          Previous
        </Button>

        <div className="text-center">
          <p className="font-semibold">Question {currentStep + 1} of {questions.length}</p>
          <p>Total Score: {calculateScore()}</p>
        </div>

        <Button
          onClick={() => setCurrentStep(prev => Math.min(questions.length - 1, prev + 1))}
          disabled={currentStep === questions.length - 1}
        >
          Next
        </Button>
      </div>
    </Card>
  );
};

export default StrokeScaleForm;
