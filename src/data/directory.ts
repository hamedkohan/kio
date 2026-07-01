// Operations-managed directory: the clinicians and imaging centers that feed the
// dropdowns across the platform. Replaces hardcoded names so Operations can manage
// who/where cases are assigned and referred.

export type ClinicianRole = "radiologist" | "neurologist";

export type DirectoryClinician = {
  id: string;
  name: string;
  role: ClinicianRole;
  specialty: string;
  centerId?: string;
  active: boolean;
};

export type ImagingCenter = {
  id: string;
  name: string;
  city: string;
  modalities: string;
  active: boolean;
};

export type Directory = {
  clinicians: DirectoryClinician[];
  centers: ImagingCenter[];
};

export const initialDirectory: Directory = {
  clinicians: [
    { id: "clin-azadi", name: "Dr. N. Azadi", role: "radiologist", specialty: "Neuroradiology", centerId: "ctr-mehr", active: true },
    { id: "clin-farzan", name: "Dr. M. Farzan", role: "radiologist", specialty: "Neuroradiology", centerId: "ctr-pars", active: true },
    { id: "clin-sadeghi", name: "Dr. P. Sadeghi", role: "neurologist", specialty: "Cognitive neurology", active: true },
    { id: "clin-vaziri", name: "Dr. L. Vaziri", role: "neurologist", specialty: "Memory clinic", active: true },
  ],
  centers: [
    { id: "ctr-mehr", name: "Mehr Imaging Center", city: "Tehran", modalities: "MRI 3T · MRI 1.5T", active: true },
    { id: "ctr-pars", name: "Pars Diagnostic Imaging", city: "Tehran", modalities: "MRI 1.5T · CT", active: true },
    { id: "ctr-noor", name: "Noor Medical Imaging", city: "Isfahan", modalities: "MRI 3T", active: true },
  ],
};

// Upsert by id — replace an existing entry or append a new one.
export function upsertById<T extends { id: string }>(list: T[], entry: T): T[] {
  const index = list.findIndex((item) => item.id === entry.id);
  if (index === -1) return [...list, entry];
  const next = list.slice();
  next[index] = entry;
  return next;
}

export function makeDirectoryId(prefix: string, seed: number): string {
  return `${prefix}-${seed.toString(36)}${(seed % 97).toString(36)}`;
}
