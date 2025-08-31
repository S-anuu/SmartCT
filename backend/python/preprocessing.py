import SimpleITK as sitk
import nibabel as nib
import numpy as np
import nibabel as nib
from torch.utils.data import Dataset
from monai.data import MetaTensor 
from monai.transforms import Compose, LoadImage, EnsureChannelFirst, EnsureType, Orientation, Spacing, Resize, NormalizeIntensity, ToTensor
from pathlib import Path
import config  # Your image size config
import logging
import os
import sys
import tempfile

# Add missing import at the top
import pydicom
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# Update the DICOM loading function
def load_dicom_series(dicom_dir):
    """Robust DICOM loading with multiple fallback methods"""
    try:
        # Method 1: Try SimpleITK's default reader
        reader = sitk.ImageSeriesReader()
        
        # Get all potential DICOM files
        dicom_files = []
        for root, _, files in os.walk(dicom_dir):
            for f in files:
                file_path = os.path.join(root, f)
                try:
                    with open(file_path, 'rb') as fp:
                        fp.seek(128)
                        if fp.read(4) == b'DICM':
                            dicom_files.append(file_path)
                except:
                    continue
        
        if not dicom_files:
            raise ValueError("No DICOM files found (missing DICM prefix)")
        
        # Method 2: Try with GDCM explicitly
        try:
            reader.SetFileNames(dicom_files)
            reader.SetImageIO("GDCMImageIO")  # Explicitly use GDCM
            image = reader.Execute()
            if sum(image.GetSize()) > 0:
                return image
        except:
            pass
        
        # Method 3: Manual loading with pydicom
        try:
            slices = []
            for f in dicom_files:
                try:
                    ds = pydicom.dcmread(f)
                    if hasattr(ds, 'pixel_array'):
                        slices.append(ds)
                except:
                    continue
            
            if not slices:
                raise ValueError("No readable DICOM slices found")
            
            # Sort by instance number if available
            try:
                slices.sort(key=lambda x: int(x.InstanceNumber))
            except:
                pass
            
            # Create 3D volume
            volume = np.stack([s.pixel_array for s in slices])
            
            # Convert to SimpleITK image
            image = sitk.GetImageFromArray(volume)
            
            # Set basic spacing if available
            if hasattr(slices[0], 'PixelSpacing'):
                image.SetSpacing(slices[0].PixelSpacing + [slices[0].SliceThickness])
            
            return image
            
        except Exception as e:
            raise RuntimeError(f"Manual DICOM loading failed: {str(e)}")
            
    except Exception as e:
        logging.error(f"DICOM loading failed: {str(e)}")
        raise RuntimeError(f"Could not load DICOM series: {str(e)}")
    
def convert_dicom_to_nifti(dicom_dir, output_path):
    """Convert DICOM to NIfTI with proper orientation and metadata handling"""
    
    try:
        # Load DICOM series
        sitk_image = load_dicom_series(dicom_dir)
        
        # Get metadata from first DICOM file
        dicom_files = []
        for root, _, files in os.walk(dicom_dir):
            for f in files:
                file_path = os.path.join(root, f)
                try:
                    with open(file_path, 'rb') as fp:
                        fp.seek(128)
                        if fp.read(4) == b'DICM':
                            dicom_files.append(file_path)
                except:
                    continue
        
        if not dicom_files:
            raise ValueError("No DICOM files found for metadata extraction")
        
        # Read metadata from first DICOM file
        ds = pydicom.dcmread(dicom_files[0], stop_before_pixels=True)
        
        # Create NIfTI image with proper orientation
        image_array = sitk.GetArrayFromImage(sitk_image)  # (Z,Y,X)
        
        # Create affine matrix from DICOM metadata if available
        try:
            pixel_spacing = ds.PixelSpacing
            slice_thickness = ds.SliceThickness
            affine = np.eye(4)
            affine[0, 0] = pixel_spacing[0]
            affine[1, 1] = pixel_spacing[1]
            affine[2, 2] = slice_thickness
        except:
            affine = np.eye(4)
            logger.warning("Using identity affine - DICOM metadata not complete")
        
        # Create NIfTI image
        nii_img = nib.Nifti1Image(image_array, affine)
        
        # Add important DICOM metadata to NIfTI header
        header = nii_img.header
        if hasattr(ds, 'SeriesDescription'):
            header['descrip'] = str(ds.SeriesDescription)
        if hasattr(ds, 'PatientID'):
            header['aux_file'] = str(ds.PatientID)
        
        # Save compressed NIfTI
        output_path = Path(output_path)
        if not output_path.suffixes or output_path.suffix != '.gz':
            output_path = output_path.with_suffix('.nii.gz')
        
        nib.save(nii_img, str(output_path))
        return output_path
        
    except Exception as e:
        logger.error(f"DICOM to NIfTI conversion failed: {str(e)}")
        raise RuntimeError(f"Conversion failed: {str(e)}")
    
def verify_dicom_files(dicom_dir):
    """Enhanced verification with pixel data check"""
    valid_files = []
    for root, _, files in os.walk(dicom_dir):
        for f in files:
            file_path = os.path.join(root, f)
            try:
                # Check DICOM signature
                with open(file_path, 'rb') as fp:
                    fp.seek(128)
                    if fp.read(4) != b'DICM':
                        continue
                
                # Try reading FULL file with pydicom
                ds = pydicom.dcmread(file_path)
                
                # Essential checks
                if not hasattr(ds, 'pixel_array'):
                    logging.warning(f"File {file_path} has no pixel data")
                    continue
                    
                if not hasattr(ds, 'Rows') or not hasattr(ds, 'Columns'):
                    logging.warning(f"File {file_path} missing geometry info")
                    continue
                    
                # Quick pixel array check
                try:
                    test_array = ds.pixel_array
                    if test_array.size == 0:
                        logging.warning(f"File {file_path} has empty pixel array")
                        continue
                except:
                    logging.warning(f"File {file_path} has unreadable pixel data")
                    continue
                
                valid_files.append(file_path)
                
            except Exception as e:
                logging.warning(f"File {file_path} failed verification: {str(e)}")
                continue
    
    if not valid_files:
        raise ValueError(f"No valid DICOM files with pixel data found in {dicom_dir}")
    
    return valid_files

def save_compressed_nifti(sitk_image, output_path, compress=True):
    """Save as .nii.gz using NiBabel with proper compression."""
    image_array = sitk.GetArrayFromImage(sitk_image)  # shape (D,H,W)
    affine = np.eye(4)  # Replace with correct affine if needed
    
    # Create NIfTI image and save
    nii = nib.Nifti1Image(image_array, affine)
    
    # Ensure path ends with .nii.gz for compression
    if compress and not str(output_path).endswith('.nii.gz'):
        output_path = str(output_path) + '.nii.gz'
    
    nib.save(nii, str(output_path))  # Compression automatic with .nii.gz suffix

def load_and_preprocess_nifti(nifti_path, transforms=None):
    """Robust NIfTI loading with dimension validation and reorientation"""
    try:
        # Load NIfTI file
        img = nib.load(str(nifti_path))
        img_array = img.get_fdata().astype(np.float32)
        
        # Validate basic dimensions
        if img_array.ndim not in (3, 4):
            raise ValueError(f"Expected 3D or 4D array, got {img_array.ndim}D")
            
        # Handle 4D data (take first volume)
        if img_array.ndim == 4:
            img_array = img_array[..., 0]
            
        # Standardize orientation (ensure Z is first dimension)
        if img_array.shape[0] < img_array.shape[2]:
            img_array = np.transpose(img_array, (2, 1, 0))  # Swap Z and X axes
            
        # Add channel dimension (1, Z, Y, X)
        img_array = img_array[np.newaxis, ...]
        
        # Validate final shape
        if img_array.ndim != 4 or img_array.shape[0] != 1:
            raise ValueError(f"Invalid array shape after preprocessing: {img_array.shape}")
            
        # Apply transforms if provided
        if transforms:
            try:
                img_array = transforms(img_array)
            except Exception as e:
                raise ValueError(f"Transform failed: {str(e)}")
                
        return img_array
        
    except Exception as e:
        logger.error(f"NIfTI loading failed: {str(e)}")
        raise RuntimeError(f"Could not load NIfTI: {str(e)}")
    
# Updated transform pipeline for inference - does NOT include LoadImage (you load explicitly above)
test_transforms = Compose([
    EnsureChannelFirst(channel_dim=0),  # already channel first, but safe to keep
    EnsureType(),
    Orientation(axcodes="RAS"),
    Spacing(pixdim=(1.0, 1.0, 1.0), mode="bilinear"),
    Resize(spatial_size=config.IMAGE_SIZE),
    NormalizeIntensity(nonzero=True, channel_wise=True),
    ToTensor()
]) 

def convert_labels_to_targets(label_dict):
    # Binary targets: injury only
    bowel = label_dict['bowel_injury']
    extra = label_dict['extravasation_injury']

    # Multi-class targets: 0=healthy, 1=low, 2=high
    def get_class(keys):
        for i, key in enumerate(keys):
            if label_dict[key] == 1:
                return i
        return 0

    kidney = get_class(['kidney_healthy', 'kidney_low', 'kidney_high'])
    liver = get_class(['liver_healthy', 'liver_low', 'liver_high'])
    spleen = get_class(['spleen_healthy', 'spleen_low', 'spleen_high'])

    return {
        "bowel": float(bowel),
        "extra": float(extra),
        "kidney": kidney,
        "liver": liver,
        "spleen": spleen,
    }

class RSNADataset(Dataset):
    def __init__(self, metadata_list, transforms=None, has_labels=True):
        """
        Initialize the dataset
        
        Args:
            metadata_list: List of dictionaries containing scan metadata
            transforms: Optional transforms to apply
            has_labels: Whether the dataset includes labels
        """
        self.metadata_list = metadata_list
        self.transforms = transforms
        self.has_labels = has_labels

    def __len__(self):
        return len(self.metadata_list)

    def __getitem__(self, idx):
        entry = self.metadata_list[idx]
        try:
            nifti_path = entry["nifti_path"]
            
            # Load with validation
            volume = load_and_preprocess_nifti(nifti_path)
            
            # Apply transforms if they exist
            if self.transforms:
                volume = self.transforms(volume)
            
            # Create sample
            sample = {"image": MetaTensor(volume)}
            
            if self.has_labels:
                targets = convert_labels_to_targets(entry['labels'])
                sample["label"] = torch.tensor([
                    targets["bowel"],
                    targets["extra"],
                    targets["kidney"],
                    targets["liver"],
                    targets["spleen"]
                ], dtype=torch.float32)
                
            return sample
            
        except Exception as e:
            logger.error(f"Failed to process {nifti_path}: {str(e)}")
            raise ValueError(f"Error processing {nifti_path}: {str(e)}")
        

def repair_nifti(input_path, output_path=None):
    """Attempt to repair malformed NIfTI files"""
    try:
        img = nib.load(str(input_path))
        data = img.get_fdata()
        affine = img.affine
        
        # Create new clean NIfTI image
        new_img = nib.Nifti1Image(data, affine)
        
        if output_path is None:
            output_path = input_path
            
        nib.save(new_img, str(output_path))
        return output_path
        
    except Exception as e:
        logger.error(f"Repair failed: {str(e)}")
        raise RuntimeError(f"Could not repair NIfTI: {str(e)}")