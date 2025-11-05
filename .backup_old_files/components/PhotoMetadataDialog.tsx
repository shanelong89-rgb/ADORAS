import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Calendar, MapPin, Users, Tag, Camera, X, ExternalLink } from 'lucide-react';
import { Memory } from '../App';

// Helper function to check if a string contains GPS coordinates
function isGPSCoordinates(location: string): boolean {
  if (!location) return false;
  const gpsPattern = /^-?\d+\.\d+,\s*-?\d+\.\d+$/;
  return gpsPattern.test(location.trim());
}

// Helper function to get Google Maps URL from GPS coordinates
function getMapURL(location: string): string {
  const trimmed = location.trim();
  return `https://www.google.com/maps?q=${encodeURIComponent(trimmed)}`;
}

export interface PhotoMetadata {
  photoUrl: string;
  fileName: string;
  photoDate?: Date;
  photoLocation?: string;
  detectedFaces?: number;
  detectedPeople?: string[];
  suggestedTags: string[];
}

interface PhotoMetadataDialogProps {
  open: boolean;
  metadata: PhotoMetadata | null;
  onConfirm: (metadata: PhotoMetadata) => void;
  onCancel: () => void;
}

export function PhotoMetadataDialog({ open, metadata, onConfirm, onCancel }: PhotoMetadataDialogProps) {
  const [editedMetadata, setEditedMetadata] = useState<PhotoMetadata | null>(null);
  const [peopleInput, setPeopleInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const dateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (metadata) {
      setEditedMetadata(metadata);
      setPeopleInput(metadata.detectedPeople?.join(', ') || '');
      setTagsInput(metadata.suggestedTags.join(', '));
      setLocationInput(metadata.photoLocation || '');
      setDateInput(metadata.photoDate ? new Date(metadata.photoDate).toISOString().slice(0, 16) : '');
    }
  }, [metadata]);

  const handleConfirm = () => {
    if (!editedMetadata) return;

    const finalMetadata: PhotoMetadata = {
      ...editedMetadata,
      photoDate: dateInput ? new Date(dateInput) : editedMetadata.photoDate,
      photoLocation: locationInput.trim() || editedMetadata.photoLocation,
      detectedPeople: peopleInput.trim() 
        ? peopleInput.split(',').map(p => p.trim()).filter(p => p)
        : editedMetadata.detectedPeople,
      suggestedTags: tagsInput.trim()
        ? tagsInput.split(',').map(t => t.trim()).filter(t => t)
        : editedMetadata.suggestedTags
    };

    onConfirm(finalMetadata);
  };

  const removePerson = (person: string) => {
    const people = peopleInput.split(',').map(p => p.trim()).filter(p => p !== person);
    setPeopleInput(people.join(', '));
  };

  const removeTag = (tag: string) => {
    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t !== tag);
    setTagsInput(tags.join(', '));
  };

  if (!editedMetadata) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Photo Details
          </DialogTitle>
          <DialogDescription>
            Review and edit the extracted photo information before sharing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo Preview */}
          <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center" style={{ maxHeight: '400px' }}>
            <img 
              src={editedMetadata.photoUrl} 
              alt="Uploaded photo" 
              className="w-full h-auto max-h-[400px] object-contain"
            />
          </div>

          {/* File Name */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">File Name</Label>
            <div className="p-2 bg-gray-50 rounded text-sm">{editedMetadata.fileName}</div>
          </div>

          {/* Date & Time */}
          <div className="space-y-2">
            <Label htmlFor="photoDate" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date & Time
              {editedMetadata.photoDate && (
                <Badge variant="secondary" className="text-xs ml-auto">
                  Extracted from EXIF
                </Badge>
              )}
            </Label>
            <Input
              id="photoDate"
              type="datetime-local"
              value={dateInput}
              onChange={(e) => {
                setDateInput(e.target.value);
                // Clear existing timeout
                if (dateTimeoutRef.current) {
                  clearTimeout(dateTimeoutRef.current);
                }
                // Auto-close after user stops changing values for 1.5 seconds (indicating completion)
                if (e.target.value && e.target.value.length === 16) {
                  dateTimeoutRef.current = setTimeout(() => {
                    e.target.blur();
                  }, 1500);
                }
              }}
              placeholder="Select date and time"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
              {editedMetadata.photoLocation && (
                <Badge variant="secondary" className="text-xs ml-auto">
                  Extracted from GPS
                </Badge>
              )}
            </Label>
            <Input
              id="location"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Add location (e.g., New York, NY)"
            />
            {locationInput && isGPSCoordinates(locationInput) && (
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="outline" className="text-xs">
                  GPS: {locationInput}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => window.open(getMapURL(locationInput), '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View on Map
                </Button>
              </div>
            )}
          </div>

          {/* Detected People */}
          <div className="space-y-2">
            <Label htmlFor="people" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              People in Photo
              {editedMetadata.detectedFaces && editedMetadata.detectedFaces > 0 && (
                <Badge variant="secondary" className="text-xs ml-auto">
                  {editedMetadata.detectedFaces} {editedMetadata.detectedFaces === 1 ? 'face' : 'faces'} detected
                </Badge>
              )}
            </Label>
            <Input
              id="people"
              value={peopleInput}
              onChange={(e) => setPeopleInput(e.target.value)}
              placeholder="Add names separated by commas (e.g., Mom, Dad, Grandma)"
            />
            {peopleInput && (
              <div className="flex flex-wrap gap-2 mt-2">
                {peopleInput.split(',').map(person => person.trim()).filter(p => p).map((person, idx) => (
                  <Badge key={idx} variant="outline" className="gap-1">
                    {person}
                    <button
                      type="button"
                      onClick={() => removePerson(person)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
              <Badge variant="secondary" className="text-xs ml-auto">
                Auto-generated
              </Badge>
            </Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Add tags separated by commas"
            />
            {tagsInput && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tagsInput.split(',').map(tag => tag.trim()).filter(t => t).map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Share Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}