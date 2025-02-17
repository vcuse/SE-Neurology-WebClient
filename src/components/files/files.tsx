"use client"

import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FilesProps {}

interface Question {
  id: number;
  text: string;
  options: string[];
}

interface patientForm {
  name: string;
  dob: string;
  form_date: string;
  results: string;
  id: number;
}

interface FormData {
  [key: number]: number;
}

export function Files({}: FilesProps) {
  const [formData, setFormData] = useState<FormData>({});
  const [patientName, setPatientName] = useState('');
  const [dob, setDob] = useState('');
  const [formsFetched, setFormsFetched] = useState(false);
  const [formSelected, setFormSelected] = useState(false);
  const [strokeScaleForms, setStrokeScaleForms] = useState<patientForm[]>([]);

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
  };

  const renderQuestion = (question: Question) => {
    const selectedOption = formData[question.id];
    return (
      <div key={question.id} className="space-y-4">
        <h3 className="text-lg font-semibold">{question.text}</h3>
        <div className="space-y-2">
          {question.options.map((option: string, index: number) => (
            <Button
              disabled={true}
              key={index}
              variant={selectedOption === index ? "default" : "outline"}
              className="w-full justify-start text-left"
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderData = (event: any) => {
    if (event.target.value != "Select Form") {
      setFormSelected(true)
    }
    else {
      setFormData([]);
      setFormSelected(false);
      return;
    }
    let file;
    let id = Number(event.target.value.split(": ")[1].replace(")", ""));
    strokeScaleForms.forEach((item) => {
      if (item.id === id){
        file = item;
      }
    });
    
    const results = file!.results;
    for (let i = 0; i < results.length; i++) {
      handleOptionSelect(i + 1, Number(results[i]));
    }
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

  const fetchPatientForms = async () => {
    setFormSelected(false);
    setFormData([]);
    try {
      const response = await fetch('http://localhost:9000/key=peerjs/post', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Action: "getForms", 
        },
        body: JSON.stringify({
          patientName,
          DOB: dob
        }),
      });
      let strokeScaleForms = await response.json();
      setFormsFetched(true);
      setStrokeScaleForms(strokeScaleForms);
    }
    catch (error){
      console.log(error);
    }
  }

  return (
    <Card className="w-full p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-6">Files</h2>
        
        <div className="mb-6">
          <label htmlFor="patientName" className="block text-sm font-medium mb-2">Patient Name</label>
          <input
            type="text"
            id="patientName"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Enter patient name"
          />
          <label htmlFor="DOB" className="block text-sm font-medium mb-2">Date of Birth (MM/DD/YYYY)</label>
          <input
            type="text"
            id="DOB"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Enter patient's date of birth"
          />
        </div>
        
          <div className="text-xl font-bold text-center">
            <br/><Button onClick={fetchPatientForms}>
              Submit
            </Button>
          <div className="mt-6 pt-6 border-t"></div>
        </div>
        {formsFetched && <div className="space-y-8">
          <div className="space-y-4">
            <select className="text-lg font-semibold" onChange={renderData}>
              <option>Select Form</option>
                {strokeScaleForms.map((item) => (
              <option key={item.id}>{item.form_date + " Stroke Scale (ID: " + item.id + ")"}</option>
            ))}
          </select>
          </div>
        </div>
        }
      </div>
      {formsFetched && <div className="text-xl font-bold text-center">
        {formSelected && <div className="space-y-8">
          {questions.map((question) => (
            <div key={question.id} className="border-b pb-6">
              {renderQuestion(question)}
            </div>
          ))}
        </div>
        }
        Total NIHSS Score: {calculateScore()}
      </div>
      }
    </Card>
  );
}
