import {Drawer} from 'antd'
import BacklogTable from '../BacklogTable'
import React from "react";

const BacklogTableDrawer = ({ open, onClose, data }) => {    return (
        <Drawer
            width="90%"
            title="Backlog Canvas"
            onClose={onClose}
            open={open}
            destroyOnClose
        >
            {open && <BacklogTable data={data} disableDrawers={true} />}
        </Drawer>
    )
}

export default React.memo(BacklogTableDrawer, (prevProps, nextProps) => prevProps.open === nextProps.open)
