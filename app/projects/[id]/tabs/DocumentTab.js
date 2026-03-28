'use client';
import DocumentManager from '@/components/documents/DocumentManager';

export default function DocumentTab({ project, projectId }) {
    return <DocumentManager projectId={projectId} projectName={project.name} />;
}
