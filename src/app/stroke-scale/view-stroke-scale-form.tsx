"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { strokeScaleQuestions } from "@/app/stroke-scale/new-stroke-scale-form"; // adjust path if needed
import { cn } from "@/lib/utils";

type Props = {
  form: any;
  onBack: () => void;
};

export default function ViewStrokeScaleForm({ form, onBack }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [patientName, setPatientName] = useState(form.name);
  const [dob, setDob] = useState(form.dob);
  const [originalPatientName] = useState(form.name);
  const [originalDOB] = useState(form.dob);
  const convertResultsToOptions = (results: string) =>
    results.split("").map((char, i) => {
      const score = parseInt(char);
      const idx = strokeScaleQuestions[i].options.findIndex((opt) => opt.score === score);
      return idx !== -1 ? idx : null;
    });
  const originalOptions = convertResultsToOptions(form.results);
  const [originalSelectedOptions] = useState<(number | null)[]>(originalOptions);
  const [selectedOptions, setSelectedOptions] = useState<(number | null)[]>(
    convertResultsToOptions(form.results)
  );

  const handleUpdate = async () => {
    const resultsString = selectedOptions
      .map((opt, i) => (opt !== null ? strokeScaleQuestions[i].options[opt].score : "9"))
      .join("");

    const payload = {
      patientName: patientName,
      dob: dob,
      formDate: form.form_date,
      results: resultsString,
      id: form.id,
      username: localStorage.getItem("username"),
    };

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_SERVER_FETCH_URL!, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Action": "updateForm",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Form updated.");
        setIsEditing(false);
        window.location.reload();
        onBack();
      } else {
        alert("Update failed.");
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("Update failed.");
    }
  };

  const handleDelete = async () => {
    const res = await fetch(process.env.NEXT_PUBLIC_SERVER_FETCH_URL!, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Action": "deleteForm",
      },
      body: JSON.stringify({
        id: form.id,
        username: localStorage.getItem("username"),
      }),
    });

    if (res.ok) {
      alert("Form deleted.");
      window.location.reload();
      onBack();
    } else {
      alert("Delete failed.");
    }
  };

  return (
    <div className="min-w-[400px] max-w-[90vw] w-[800px] h-screen relative bg-white rounded-lg shadow-2xl overflow-hidden">
      <Card className="w-full h-full flex flex-col">
        <CardHeader className="sticky top-0 z-10 bg-white border-b border-blue-100">
          <CardTitle className="text-blue-900 text-lg text-center">View Stroke Scale Form</CardTitle>
          <div className="flex flex-col gap-2 mt-4">
            <input
              type="text"
              disabled={!isEditing}
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Patient Name"
              className={cn(
                "w-full rounded-md border px-3 py-2 text-sm",
                isEditing ? "border-gray-300 bg-white" : "border-gray-300 bg-gray-100"
              )}
            />
            <input
              type="text"
              disabled={!isEditing}
              value={dob}
              placeholder="Patient DOB (MM/DD/YYYY)"
              onChange={(e) => setDob(e.target.value)}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-sm",
                isEditing ? "border-gray-300 bg-white" : "border-gray-300 bg-gray-100"
              )}
            />
            <p className="text-sm text-gray-500 text-center">Date: {form.form_date}</p>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto bg-gray-50 p-4 min-h-0">
          <div className="space-y-6">
            {strokeScaleQuestions.map((question, index) => {
              const selectedOption = selectedOptions[index];

              return (
                <div key={question.id} className="bg-purple-200 p-4 rounded-md">
                  <h3 className="font-semibold text-blue-900">{question.questionHeader}</h3>
                  {question.subHeader && <p className="text-sm text-gray-700 mb-2">{question.subHeader}</p>}
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => {
                      const isSelected = selectedOption === optionIndex;
                      return (
                        <button
                          key={optionIndex}
                          onClick={isEditing ? () => {
                            const updated = [...selectedOptions];
                            updated[index] = optionIndex;
                            setSelectedOptions(updated);
                          } : undefined}
                          className={cn(
                            "w-full flex justify-between items-center px-4 py-2 rounded border transition-colors text-left",
                            isSelected
                              ? "bg-purple-400 text-white border-purple-500"
                              : "bg-white text-black border-gray-200" + (isEditing ? " hover:bg-purple-100" : "")
                          )}
                        >
                          <span>{option.title}</span>
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

        <div className="sticky bottom-0 bg-white border-t border-blue-100 flex justify-center gap-4 p-4">
          {isEditing ? (
            <>
              <Button className="bg-green-600 text-white hover:bg-green-700" onClick={handleUpdate}>
                Save
              </Button>
              <Button
                className="bg-gray-500 text-white hover:bg-gray-600"
                onClick={() => {
                  setPatientName(originalPatientName);
                  setDob(originalDOB);
                  setSelectedOptions(originalSelectedOptions);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleDelete}>
                Delete
              </Button>
              <Button className="bg-gray-400 text-white hover:bg-gray-500" onClick={onBack}>
                Back
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
