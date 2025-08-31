import torch
import torch.nn as nn
import torch.nn.functional as F
from monai.networks.nets import DenseNet121

class DenseNet121model(nn.Module):
    def __init__(self, in_channels=1, pretrained=False):
        super().__init__()
        
        # Grad-CAM hooks
        self.activations = None
        self.gradients = None
        
        # Backbone - using MONAI's DenseNet121 which already includes GAP
        self.backbone = DenseNet121(
            spatial_dims=3,
            in_channels=in_channels,
            out_channels=512,  # This is the output after GAP
            pretrained=pretrained
        )
        
        # Register hook for Grad-CAM on the last conv layer
        self.backbone.features[-1].register_forward_hook(self.save_activation)
        
        # Classification heads
        self.bowel_head = self._create_binary_head()
        self.extra_head = self._create_binary_head()
        self.liver_head = self._create_multiclass_head()
        self.kidney_head = self._create_multiclass_head()
        self.spleen_head = self._create_multiclass_head()
        
    def _create_binary_head(self):
        return nn.Sequential(
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.SiLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 1)
        )
    
    def _create_multiclass_head(self):
        return nn.Sequential(
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.SiLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 3)
        )
    
    def save_activation(self, module, input, output):
        """Save activations for Grad-CAM"""
        self.activations = output
        if output.requires_grad:
            output.register_hook(self.save_gradient)
    
    def save_gradient(self, grad):
        """Save gradients for Grad-CAM"""
        self.gradients = grad
    
    def forward(self, x):
        # Forward pass through backbone
        if x.requires_grad:
            x.register_hook(self.save_gradient)
        self.activations = x
        
        # Get features (shape: [B, 512] after GAP)
        features = self.backbone(x)
        
        return {
            "bowel": self.bowel_head(features),
            "extra": self.extra_head(features),
            "liver": self.liver_head(features),
            "kidney": self.kidney_head(features),
            "spleen": self.spleen_head(features)
        }
    
    def get_activations_gradient(self):
        return self.gradients
    
    def get_activations(self):
        return self.activations