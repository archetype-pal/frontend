import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Annotation {
  id: string;
  type: string;
}

interface AnnotationMetadataProps {
  annotations: Annotation[];
}

export default function AnnotationMetadata({ annotations }: AnnotationMetadataProps) {
  const annotationTypes = annotations.reduce(
    (acc, annotation) => {
      acc[annotation.type] = (acc[annotation.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Annotation Metadata</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Total Annotations: {annotations.length}</p>
        <h3 className="mt-4 mb-2 font-semibold">Annotation Types:</h3>
        <ul>
          {Object.entries(annotationTypes).map(([type, count]) => (
            <li key={type}>
              {type}: {count}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
