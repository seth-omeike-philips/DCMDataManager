import React from 'react'
import Navbar from './NavBar'
import DicomStackViewer from './DicomStackViewer'
import DicomSidebar from './DicomSidebar'
import { BaseDicomMetadata } from '@/types/BaseDicomMetadata';

interface Props {
    dataSet: Record<string, BaseDicomMetadata>
    curSlice: DicomSlice | undefined
    setCurSlice:React.Dispatch<React.SetStateAction<DicomSlice | undefined>>
    isAllFilesAvailable: boolean

    handleClose: () => void
}

const MainApp: React.FC<Props> = ({dataSet,curSlice,isAllFilesAvailable,setCurSlice,handleClose}) => {
  return (
    <div className="flex flex-col w-full h-screen overflow-hidden">
        <Navbar dataSet={dataSet} isAllFilesAvailable={isAllFilesAvailable} handleClose={handleClose}/>
        <div className="flex flex-1 overflow-hidden">
            
            <div className="flex-1 flex items-center justify-center">
            <DicomStackViewer setCurSlice={setCurSlice} isAllFilesAvailable={isAllFilesAvailable} />
            </div>

            <DicomSidebar dataSet={dataSet} curSlice={curSlice}/>
        </div>
    </div>
  )
}

export default MainApp