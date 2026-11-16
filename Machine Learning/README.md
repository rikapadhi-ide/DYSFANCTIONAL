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

## Performance Improvements and Limitations

With more time and resources, we would collect more balanced training examples from different people, camera angles, distances and lighting conditions. We would also retrain the model using the final camera code so that the training inputs match the live inputs.

We would test the model on people and recordings not used during training, measure accuracy for each class, and compare different KNN settings. A model that recognises movement over time could also help distinguish gestures that look similar in a single frame.

However, some limitations would remain. Hands can be hidden, move outside the camera view or become difficult to track in poor lighting. Similar gestures can have different meanings, so the system cannot reliably understand a person's intention. Our current classifier always chooses one of four classes, even when an unfamiliar gesture is shown. The three-second voting window reduces rapid changes but also delays the response.

We have not yet measured accuracy on a separate test set.
