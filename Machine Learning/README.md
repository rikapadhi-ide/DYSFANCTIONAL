# Machine Learning

## Overview

This section contains the machine learning models and training files used to interpret visual inputs and determine the fan's behavioral responses.

## Contents

-   Wekinator project files
    
-   Input configurations
    
-   Classifications
    
-   Training documentation
    

## How It Works

A webcam captures visual information from the environment, which is processed and used as input for a machine learning classifier.

Using Wekinator, the system learns to distinguish between different input categories and assigns them to corresponding behavioural states.

These classifications allow the fan to respond differently depending on the detected input.

## Getting Started

1.  Open the Wekinator project.
    
2.  Connect the relevant input source.
    
3.  Load or retrain the classifier.
    
4.  Test the classification outputs.
    

## Requirements

-   Wekinator
    
-   Webcam
    
-   Processing/P5.js
    
-   OSC communication setup

  
  # Our Training Setup

We used p5.js and ml5 to track hand and body movements and send 38 values to Wekinator.

The saved model uses KNN (k = 1), which compares each new input with the closest training example. This suits our project because we teach the fan through examples of gestures.

We recorded 4,504 training examples across four classes:

| Class | Fan response | Examples |
| --- | --- | ---: |
| 1 | Avoid greeting | 1,094 |
| 2 | Threat | 1,079 |
| 3 | Begging | 1,035 |
| 4 | Sleepy | 1,296 |

## Further Improvements

More examples from different people, camera distances and lighting could help make recognition more reliable. We have not measured accuracy on a separate test set.

Some inputs in the latest camera code differ from the saved training data, so these need to be checked together before reuse.
