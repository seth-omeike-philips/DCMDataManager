
# Dicom App Manager

## Purpose
This DICOM APP is used to visualize DICOM data, edit the tags of the DICOM data, and export them.

## Structure

### API
    /electron
        main.ts # API endpoints 
        /helperMethods # methods utilized by the API endpoints


### APP
    /components
        DicomApp.tsx
            This file renders either the upload screen or the MainApp.tsx
            Using some methods, it processes uploaded files asynchronously, sending them to our electorn API backend readDicom
        
        DicomSidebar.tsx
            This file renders the tag names and values to the right of the screen in a scrollable viewer. For nested tags, the UI is adjusted appropriately 

        DicomStackViewer.tsx
            This file renders the pixelData of the current selected Slice if it exists.

        EditTagsModal.tsx
            Allows user to select what type of edit they would like to make to the available dicom tags. 
            Allows user to upload profiles (json file containing a pre-written set of edits that will all be applied)
            Users can also manually create and then export their profile into a json file 

        EditTagsRenderTags.tsx
            An extension of EditTagsModal. Contains the logic that allows users to select the type of edit they would like to apply to each tag & sub tag
            Contains simple UI allowing users to differentiate main tags from nested tags and arrays 

        MainApp.tsx
            This file functions as a displayer for the app after the user has uploaded their files. Combines the Navbar, DicomeSidebar and DicomStackViewer into a 1 page UI. 
        Modal.tsx
            This file enables us to spawn a Modal viewer anywhere. Use it for user notifiations about error, success, or info.

        NavBar.tsx

        UploadCard.tsx

        UploadProfileHelp.tsx
    /context
        FileContext.tsx
            This context tracks the files that the user uploads, specifically the filePaths and upload root (for exporting)
            
        ModalContext.tsx
            This context allows us to display a modal with a custom image at any point in the app.
    
    /policy
        BasePolicyLogic.ts 
            This file contains the initial setup for editing DICOM data tags. Every option is set to KEEP (i.e do not edit any tag)

        MappingDescription.ts
            Some tags have the option to be mapped (a preset rule edit for a tag). This file describes the preset mapping rule for the selected tags 
        
        NonEditableTags.ts 
            Contains tags that the user should not be able to edit.
        
        PolicyLogic.ts
            This file describes the edits the user is allowed to make (REMOVE, HASH, GENERATE_UID, MAP, KEEP, CUSTOM)
            The policyLogicFunction will then create the modifiedDataset (not the best name), that keeps track of the change the user decided given the pathKey
    
    /types
        Custom types and module initalizations 
    
    /storage
        DicomStore.ts
            This file exports a record that tracks the filePath -> dicom data of the uploaded files (this happens in the read-dicom api). This is important during our export as we need the original dicom to edit.
    
    /scripts
        PhilipsTags.json contains the dictionary that allows us to transform private DICOM tags to readable english
    
