/**
 * Manually parse QuickTime MOV file to extract GPS coordinates
 * QuickTime stores GPS in the ©xyz atom as ISO 6709 format
 */
async function parseQuickTimeGPS(file: File): Promise<{ latitude: number; longitude: number } | null> {
  try {
    console.log('🎬 Parsing QuickTime file for GPS data...');
    
    // Read a larger chunk of the video file to parse MP4 atoms
    // Some videos have the moov atom further into the file
    const chunkSize = Math.min(500000, file.size); // Read up to 500KB
    const chunk = await file.slice(0, chunkSize).arrayBuffer();
    const view = new DataView(chunk);
    
    console.log(`🎬 Reading ${(chunkSize / 1024).toFixed(2)} KB for atom parsing...`);
    
    // Recursively search for atoms in MP4 structure
    const findAtom = (atomName: string, startOffset: number, endOffset: number): number | null => {
      let offset = startOffset;
      
      while (offset < endOffset - 8) {
        try {
          // Read atom size (4 bytes, big-endian)
          const atomSize = view.getUint32(offset, false);
          
          // Read atom type (4 bytes ASCII)
          const atomType = String.fromCharCode(
            view.getUint8(offset + 4),
            view.getUint8(offset + 5),
            view.getUint8(offset + 6),
            view.getUint8(offset + 7)
          );
          
          // Found the atom we're looking for
          if (atomType === atomName) {
            console.log(`✅ Found ${atomName} atom at offset ${offset}`);
            return offset;
          }
          
          // If this is a container atom, search inside it
          if (atomType === 'moov' || atomType === 'trak' || atomType === 'mdia') {
            const result = findAtom(atomName, offset + 8, offset + atomSize);
            if (result !== null) return result;
          }
          
          // Move to next atom
          if (atomSize === 0 || atomSize < 8 || offset + atomSize > endOffset) {
            break;
          }
          offset += atomSize;
        } catch (e) {
          // If we can't read this atom, move forward
          break;
        }
      }
      
      return null;
    };
    
    // Find the ©xyz atom
    const xyzOffset = findAtom('©xyz', 0, view.byteLength);
    
    if (xyzOffset !== null && xyzOffset + 8 < view.byteLength) {
      // Read the ISO 6709 location string from the ©xyz atom
      const atomSize = view.getUint32(xyzOffset, false);
      const locationString = new TextDecoder().decode(
        new Uint8Array(chunk, xyzOffset + 8, atomSize - 8)
      );
      
      console.log('📍 QuickTime ISO 6709 location string:', locationString);
      
      // Parse the ISO 6709 location string
      const parsed = parseISO6709(locationString);
      if (parsed) {
        console.log('📍 Parsed ISO 6709 to coordinates:', parsed);
        return parsed;
      } else {
        console.log('⚠️  Failed to parse ISO 6709 location string');
      }
    } else {
      console.log('⚠️  ©xyz atom not found');
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error parsing QuickTime GPS data:', error);
    return null;
  }
}

/**
 * Parse ISO 6709 location string (used by QuickTime)
 * Format: "+37.7749-122.4194/" or similar
 */
function parseISO6709(iso6709: string): { latitude: number; longitude: number } | null {
  try {
    // Remove trailing slash if present
    const cleaned = iso6709.replace(/\/$/, '');
    
    // Match patterns like +37.7749-122.4194 or +37.7749+122.4194
    const match = cleaned.match(/([+-]\d+\.?\d*)([+-]\d+\.?\d*)/);
    if (match) {
      return {
        latitude: parseFloat(match[1]),
        longitude: parseFloat(match[2])
      };
    }
  } catch (e) {
    console.warn('Failed to parse ISO6709:', e);
  }
  return null;
}

/**
 * Parse GPS coordinate string
 */
function parseGPSString(coords: string): { latitude: number; longitude: number } | null {
  try {
    const parts = coords.split(/[,\s]+/);
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lon)) {
        return { latitude: lat, longitude: lon };
      }
    }
  } catch (e) {
    console.warn('Failed to parse GPS string:', e);
  }
  return null;
}

/**
 * Convert DMS (Degrees, Minutes, Seconds) to Decimal Degrees
 */
function convertDMSToDD(dms: number[], ref: string): number {
  if (!dms || dms.length < 3) return 0;
  
  const degrees = dms[0];
  const minutes = dms[1];
  const seconds = dms[2];
  
  let dd = degrees + minutes / 60 + seconds / 3600;
  
  if (ref === 'S' || ref === 'W') {
    dd = dd * -1;
  }
  
  return dd;
}

/**
 * Reverse geocode GPS coordinates to get human-readable location (city, country)
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */
async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    console.log(`🌍 Reverse geocoding coordinates: ${latitude}, ${longitude}`);
    
    // Use Nominatim API with a reasonable timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Adoras-Memory-App/1.0' // Nominatim requires a User-Agent
        }
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn('⚠️  Reverse geocoding API returned error:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('🌍 Reverse geocoding response:', data);
    
    if (!data.address) {
      console.warn('⚠️  No address data in reverse geocoding response');
      return null;
    }
    
    // Build location string from address components
    const address = data.address;
    const parts: string[] = [];
    
    // Try to get city (in order of preference)
    const city = address.city || address.town || address.village || address.municipality || address.county;
    if (city) {
      parts.push(city);
    }
    
    // Try to get state/region for some countries
    const state = address.state || address.region;
    if (state && parts.length > 0) {
      // Only add state for US, Canada, Australia
      const country = address.country;
      if (country === 'United States' || country === 'Canada' || country === 'Australia') {
        parts.push(state);
      }
    }
    
    // Always add country
    if (address.country) {
      parts.push(address.country);
    }
    
    if (parts.length === 0) {
      console.warn('⚠️  Could not extract location parts from address');
      return null;
    }
    
    const location = parts.join(', ');
    console.log(`✅ Reverse geocoded to: ${location}`);
    return location;
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('⚠️  Reverse geocoding request timed out');
    } else {
      console.warn('⚠️  Reverse geocoding failed:', error);
    }
    return null;
  }
}

/**
 * Extract metadata from photo files using EXIF data
 */
export async function extractPhotoMetadata(file: File): Promise<PhotoMetadata> {
  try {
    const exifr = await import('exifr');
    const exif = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      ifd0: true,
      ifd1: true,
    });

    if (!exif) {
      console.log('No EXIF data found in photo');
      return {};
    }

    console.log('Photo EXIF data extracted:', exif);

    const metadata: PhotoMetadata = {};

    // Extract date - try multiple fields
    if (exif.DateTimeOriginal) {
      metadata.date = exif.DateTimeOriginal instanceof Date 
        ? exif.DateTimeOriginal 
        : new Date(exif.DateTimeOriginal);
    } else if (exif.DateTime) {
      metadata.date = exif.DateTime instanceof Date 
        ? exif.DateTime 
        : new Date(exif.DateTime);
    } else if (exif.CreateDate) {
      metadata.date = exif.CreateDate instanceof Date 
        ? exif.CreateDate 
        : new Date(exif.CreateDate);
    }

    // Extract GPS coordinates
    if (exif.latitude && exif.longitude) {
      console.log(`📍 GPS coordinates found: ${exif.latitude}, ${exif.longitude}`);
      metadata.gpsCoordinates = {
        latitude: exif.latitude,
        longitude: exif.longitude,
      };
      
      // Try to get location name from coordinates (would need reverse geocoding API)
      try {
        console.log('🌍 Attempting reverse geocoding...');
        const location = await reverseGeocode(exif.latitude, exif.longitude);
        if (location) {
          console.log(`✅ Reverse geocoding successful: ${location}`);
          metadata.location = location;
        } else {
          console.log('⚠️  Reverse geocoding failed, using coordinates');
          metadata.location = `${exif.latitude.toFixed(6)}, ${exif.longitude.toFixed(6)}`;
        }
        console.log(`📍 Final photo location set to: ${metadata.location}`);
      } catch (reverseGeocodeError) {
        console.warn('⚠️  Reverse geocoding threw error, using coordinates:', reverseGeocodeError);
        metadata.location = `${exif.latitude.toFixed(6)}, ${exif.longitude.toFixed(6)}`;
      }
    } else {
      console.log('⚠️  No GPS coordinates found in photo EXIF');
    }

    // Extract camera information
    if (exif.Make) metadata.make = exif.Make;
    if (exif.Model) metadata.model = exif.Model;
    if (exif.Make && exif.Model) {
      metadata.camera = `${exif.Make} ${exif.Model}`;
    }
    
    // Extract lens information
    if (exif.LensModel) metadata.lensModel = exif.LensModel;
    
    // Extract camera settings
    if (exif.FocalLength) metadata.focalLength = exif.FocalLength;
    if (exif.FNumber) metadata.aperture = exif.FNumber;
    if (exif.ISO) metadata.iso = exif.ISO;
    if (exif.ExposureTime) {
      // Convert exposure time to readable format
      if (exif.ExposureTime < 1) {
        metadata.shutterSpeed = `1/${Math.round(1 / exif.ExposureTime)}`;
      } else {
        metadata.shutterSpeed = `${exif.ExposureTime}s`;
      }
    }

    return metadata;
  } catch (error) {
    console.error('Error extracting photo metadata:', error);
    return {};
  }
}

/**
 * Extract basic metadata from video files
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise(async (resolve) => {
    try {
      const metadata: VideoMetadata = {};
      
      // Try to extract GPS and other metadata from video EXIF first
      try {
        console.log('📹 Attempting to extract GPS from video EXIF...');
        const exifr = await import('exifr');
        
        // Try with comprehensive options for video formats
        const videoExif = await exifr.parse(file, {
          // Enable all possible metadata formats
          tiff: true,
          exif: true,
          gps: true,
          ifd0: true,
          ifd1: true,
          iptc: true,
          icc: true,
          jfif: true,
          ihdr: true,
          // IMPORTANT: These are crucial for video GPS extraction
          mergeOutput: true,
          // Enable chunked reading for large files
          chunked: true,
          // Tell exifr to look for all GPS-related fields
          pick: undefined, // Don't filter, get everything
        });
        
        if (videoExif) {
          console.log('📹 Video EXIF/metadata found:', videoExif);
          console.log('📹 All available keys:', Object.keys(videoExif));
          
          // Try multiple possible GPS field names (different video formats use different fields)
          let latitude: number | null = null;
          let longitude: number | null = null;
          
          // Standard GPS fields
          if (videoExif.latitude && videoExif.longitude) {
            latitude = videoExif.latitude;
            longitude = videoExif.longitude;
            console.log('📍 Found GPS in standard fields');
          }
          // QuickTime location string (ISO 6709 format)
          else if (videoExif['com.apple.quicktime.location.ISO6709']) {
            console.log('📍 Found QuickTime ISO6709 location:', videoExif['com.apple.quicktime.location.ISO6709']);
            const iso6709 = videoExif['com.apple.quicktime.location.ISO6709'];
            const parsed = parseISO6709(iso6709);
            if (parsed) {
              latitude = parsed.latitude;
              longitude = parsed.longitude;
              console.log('📍 Parsed ISO 6709 to coordinates');
            }
          }
          // GPS in nested object
          else if (videoExif.GPS) {
            if (videoExif.GPS.GPSLatitude !== undefined && videoExif.GPS.GPSLongitude !== undefined) {
              latitude = convertDMSToDD(
                videoExif.GPS.GPSLatitude,
                videoExif.GPS.GPSLatitudeRef
              );
              longitude = convertDMSToDD(
                videoExif.GPS.GPSLongitude,
                videoExif.GPS.GPSLongitudeRef
              );
              console.log('📍 Found GPS in nested GPS object');
            }
          }
          // QuickTime xyz atom
          else if (videoExif.GPSCoordinates) {
            const coords = videoExif.GPSCoordinates;
            if (typeof coords === 'string') {
              const parsed = parseGPSString(coords);
              if (parsed) {
                latitude = parsed.latitude;
                longitude = parsed.longitude;
                console.log('📍 Found GPS in GPSCoordinates string');
              }
            }
          }
          // Check for GPSLatitude and GPSLongitude directly (some formats)
          else if (videoExif.GPSLatitude !== undefined && videoExif.GPSLongitude !== undefined) {
            // Could be DMS array or decimal
            if (Array.isArray(videoExif.GPSLatitude)) {
              latitude = convertDMSToDD(
                videoExif.GPSLatitude,
                videoExif.GPSLatitudeRef || 'N'
              );
              longitude = convertDMSToDD(
                videoExif.GPSLongitude,
                videoExif.GPSLongitudeRef || 'E'
              );
              console.log('📍 Found GPS in direct GPSLatitude/GPSLongitude DMS arrays');
            } else if (typeof videoExif.GPSLatitude === 'number') {
              latitude = videoExif.GPSLatitude;
              longitude = videoExif.GPSLongitude;
              console.log('📍 Found GPS in direct GPSLatitude/GPSLongitude numbers');
            }
          }
          // Check all keys for any GPS-related fields
          else {
            console.log('🔍 Searching all metadata keys for GPS fields...');
            const allKeys = Object.keys(videoExif);
            
            // Look for any key containing 'latitude' or 'lat' or 'gps'
            for (const key of allKeys) {
              const lowerKey = key.toLowerCase();
              if (lowerKey.includes('latitude') || lowerKey.includes('lat')) {
                console.log(`🔍 Found potential latitude field: ${key} =`, videoExif[key]);
              }
              if (lowerKey.includes('longitude') || lowerKey.includes('lon')) {
                console.log(`🔍 Found potential longitude field: ${key} =`, videoExif[key]);
              }
              if (lowerKey.includes('gps') || lowerKey.includes('location')) {
                console.log(`🔍 Found GPS/location field: ${key} =`, videoExif[key]);
              }
            }
          }
          
          if (latitude !== null && longitude !== null) {
            console.log(`📍 Video GPS coordinates found: ${latitude}, ${longitude}`);
            metadata.gpsCoordinates = {
              latitude: latitude,
              longitude: longitude,
            };
            
            // Try to get location name from coordinates
            try {
              console.log('🌍 Attempting reverse geocoding for video...');
              const location = await reverseGeocode(latitude, longitude);
              if (location) {
                console.log(`✅ Video reverse geocoding successful: ${location}`);
                metadata.location = location;
              } else {
                console.log('⚠️  Video reverse geocoding failed, using coordinates');
                metadata.location = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
              }
              console.log(`📍 Final video location set to: ${metadata.location}`);
            } catch (reverseGeocodeError) {
              console.warn('⚠️  Video reverse geocoding threw error, using coordinates:', reverseGeocodeError);
              metadata.location = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            }
          } else {
            console.log('⚠️  No GPS data found in video EXIF');
          }
        }
      } catch (exifrError) {
        console.log('⚠️  Video EXIF extraction failed:', exifrError);
      }
      
      // If exifr failed or didn't find GPS, try manual QuickTime parsing for MOV files
      if (!metadata.gpsCoordinates && file.name.toLowerCase().endsWith('.mov')) {
        console.log('🎬 Attempting manual QuickTime GPS extraction...');
        const qtGPS = await parseQuickTimeGPS(file);
        if (qtGPS) {
          metadata.gpsCoordinates = qtGPS;
          
          // Try to get location name from coordinates
          try {
            console.log('🌍 Attempting reverse geocoding for QuickTime video...');
            const location = await reverseGeocode(qtGPS.latitude, qtGPS.longitude);
            if (location) {
              console.log(`✅ QuickTime video reverse geocoding successful: ${location}`);
              metadata.location = location;
            } else {
              console.log('⚠️  QuickTime video reverse geocoding failed, using coordinates');
              metadata.location = `${qtGPS.latitude.toFixed(6)}, ${qtGPS.longitude.toFixed(6)}`;
            }
            console.log(`📍 Final QuickTime video location set to: ${metadata.location}`);
          } catch (reverseGeocodeError) {
            console.warn('⚠️  QuickTime video reverse geocoding threw error, using coordinates:', reverseGeocodeError);
            metadata.location = `${qtGPS.latitude.toFixed(6)}, ${qtGPS.longitude.toFixed(6)}`;
          }
        } else {
          console.log('ℹ️  GPS data not available in this video format. Location can be added manually if needed.');
        }
      }
      
      // Extract basic video properties
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);

      video.onloadedmetadata = async () => {
        metadata.duration = video.duration;
        metadata.width = video.videoWidth;
        metadata.height = video.videoHeight;

        // Try to extract creation date
        const creationDate = await extractVideoCreationDate(file);
        if (creationDate) {
          metadata.date = creationDate;
        }

        // Log final metadata before resolving
        console.log('📹 Final video metadata before resolve:', {
          location: metadata.location,
          gpsCoordinates: metadata.gpsCoordinates,
          date: metadata.date,
          duration: metadata.duration
        });

        // Clean up
        URL.revokeObjectURL(url);
        resolve(metadata);
      };

      video.onerror = () => {
        console.error('Error loading video metadata');
        URL.revokeObjectURL(url);
        resolve(metadata);
      };

      video.src = url;
    } catch (error) {
      console.error('Error extracting video metadata:', error);
      resolve({});
    }
  });
}

/**
 * Extract creation date from video using MP4 container metadata
 * This extracts the actual recording date from the video file
 */
export async function extractVideoCreationDate(file: File): Promise<Date | undefined> {
  console.log(`📹 Extracting video metadata from: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  
  try {
    // First, try using exifr library which can extract metadata from many video formats
    // including MOV, MP4, M4V, etc.
    try {
      console.log('📹 Attempting exifr extraction...');
      const exifr = await import('exifr');
      const videoExif = await exifr.parse(file, {
        tiff: true,
        exif: true,
        ifd0: true,
        // Pick date-related fields
        pick: [
          'CreateDate',
          'CreationDate',
          'DateTimeOriginal',
          'MediaCreateDate',
          'TrackCreateDate',
          'MediaModifyDate',
          'ModifyDate',
          'DateTime'
        ]
      });
      
      if (videoExif) {
        console.log('📹 EXIF data found:', videoExif);
        
        // Try to find the creation date from various possible fields
        const creationDate = 
          videoExif.CreateDate || 
          videoExif.CreationDate ||
          videoExif.MediaCreateDate ||
          videoExif.TrackCreateDate ||
          videoExif.DateTimeOriginal ||
          videoExif.DateTime;
        
        if (creationDate) {
          const date = creationDate instanceof Date ? creationDate : new Date(creationDate);
          
          // Validate the date
          const now = new Date();
          const minDate = new Date('1990-01-01');
          
          if (date >= minDate && date <= now) {
            console.log('✅ Video creation date extracted via exifr:', date.toLocaleString());
            return date;
          } else {
            console.warn('❌ Invalid date from exifr:', date.toLocaleString());
          }
        } else {
          console.log('⚠️  No creation date fields found in EXIF data');
        }
      } else {
        console.log('⚠️  No EXIF data returned from exifr');
      }
    } catch (exifrError) {
      console.log('⚠️  exifr extraction failed, trying MP4 atom parsing:', exifrError);
    }
    
    // Fallback: Manual MP4 atom parsing
    console.log('📹 Attempting MP4 atom parsing...');
    
    // Read a larger chunk of the video file to parse MP4 atoms
    // Some videos have the moov atom further into the file
    const chunkSize = Math.min(500000, file.size); // Read up to 500KB
    const chunk = await file.slice(0, chunkSize).arrayBuffer();
    const view = new DataView(chunk);
    
    console.log(`📹 Reading ${(chunkSize / 1024).toFixed(2)} KB for atom parsing...`);
    
    // Recursively search for atoms in MP4 structure
    const findAtom = (atomName: string, startOffset: number, endOffset: number): number | null => {
      let offset = startOffset;
      
      while (offset < endOffset - 8) {
        try {
          // Read atom size (4 bytes, big-endian)
          const atomSize = view.getUint32(offset, false);
          
          // Read atom type (4 bytes ASCII)
          const atomType = String.fromCharCode(
            view.getUint8(offset + 4),
            view.getUint8(offset + 5),
            view.getUint8(offset + 6),
            view.getUint8(offset + 7)
          );
          
          // Found the atom we're looking for
          if (atomType === atomName) {
            console.log(`✅ Found ${atomName} atom at offset ${offset}`);
            return offset;
          }
          
          // If this is a container atom, search inside it
          if (atomType === 'moov' || atomType === 'trak' || atomType === 'mdia') {
            const result = findAtom(atomName, offset + 8, offset + atomSize);
            if (result !== null) return result;
          }
          
          // Move to next atom
          if (atomSize === 0 || atomSize < 8 || offset + atomSize > endOffset) {
            break;
          }
          offset += atomSize;
        } catch (e) {
          // If we can't read this atom, move forward
          break;
        }
      }
      
      return null;
    };
    
    // Find the mvhd (movie header) atom
    const mvhdOffset = findAtom('mvhd', 0, view.byteLength);
    
    if (mvhdOffset !== null && mvhdOffset + 20 < view.byteLength) {
      // mvhd structure:
      // 4 bytes: size
      // 4 bytes: type ('mvhd')
      // 1 byte: version
      // 3 bytes: flags
      // 4 bytes: creation time (version 0) or 8 bytes (version 1)
      
      const version = view.getUint8(mvhdOffset + 8);
      console.log(`📹 mvhd version: ${version}`);
      
      let creationTime: number;
      
      if (version === 1) {
        // 64-bit timestamp (8 bytes)
        // JavaScript doesn't handle 64-bit integers well, so we read it as two 32-bit values
        const high = view.getUint32(mvhdOffset + 12, false);
        const low = view.getUint32(mvhdOffset + 16, false);
        creationTime = (high * 0x100000000) + low;
      } else {
        // 32-bit timestamp (4 bytes) - version 0
        creationTime = view.getUint32(mvhdOffset + 12, false);
      }
      
      console.log(`📹 Raw creation time value: ${creationTime}`);
      
      // Convert from seconds since Jan 1, 1904 00:00:00 UTC to JavaScript Date
      // Jan 1, 1904 00:00:00 UTC in Unix time = -2082844800 seconds
      const SECONDS_BETWEEN_1904_AND_1970 = 2082844800;
      const unixTimestamp = creationTime - SECONDS_BETWEEN_1904_AND_1970;
      const creationDate = new Date(unixTimestamp * 1000);
      
      console.log(`📹 Converted date: ${creationDate.toLocaleString()}`);
      
      // Validate the date (should be between 1990 and now)
      const now = new Date();
      const minDate = new Date('1990-01-01');
      
      if (creationDate >= minDate && creationDate <= now) {
        console.log('✅ Video creation date extracted via MP4 atom:', creationDate.toLocaleString());
        return creationDate;
      } else {
        console.warn('❌ Invalid video creation date detected:', creationDate.toLocaleString());
      }
    } else {
      console.log('⚠️  mvhd atom not found');
    }
    
    // Fallback: try to use file's lastModified timestamp
    console.log('⚠️  Could not extract video metadata, using file lastModified as fallback');
    if (file.lastModified) {
      const fallbackDate = new Date(file.lastModified);
      console.log(`📅 Using lastModified: ${fallbackDate.toLocaleString()}`);
      return fallbackDate;
    }
    
    return undefined;
  } catch (error) {
    console.error('❌ Error extracting video creation date:', error);
    
    // Fallback to file modification date
    if (file.lastModified) {
      const fallbackDate = new Date(file.lastModified);
      console.log(`📅 Using lastModified after error: ${fallbackDate.toLocaleString()}`);
      return fallbackDate;
    }
    
    return undefined;
  }
}