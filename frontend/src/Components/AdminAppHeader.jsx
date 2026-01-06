import React from "react";
import { Grid, AppBar, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import Switch from "./Switch.jsx";
import { ALLOW_MULTLINGUAL_TOGGLE } from "../utilities/constants.js";

function AdminAppHeader({ showSwitch }) {
  const navigate = useNavigate();

  const showHomeButton = true;

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: (theme) => theme.palette.background.header,
        height: "5rem",
        boxShadow: "none",
        borderBottom: (theme) => `1.5px solid ${theme.palette.primary[50]}`,
        padding: "0 3rem",
      }}
    >
      <Grid
        container
        direction="row"
        justifyContent="flex-end"
        alignItems="center"
        className="appHeight100"
      >
        <Grid item>
          <Grid container alignItems="center" spacing={2}>
            <Grid item sx={{ display: ALLOW_MULTLINGUAL_TOGGLE && showSwitch ? "flex" : "none" }}>
              <Switch />
            </Grid>

            {showHomeButton && (
              <Grid item>
                <Button
                  variant="contained"
                  onClick={() => navigate("/admin-dashboard")}
                  sx={{
                    backgroundColor: "#D63F09",
                    color: "white",
                    borderRadius: "20px",
                    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
                    padding: "8px 20px",
                    fontSize: "1rem",
                    "&:hover": {
                      backgroundColor: "#115293",
                    },
                  }}
                >
                  Home
                </Button>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
    </AppBar>
  );
}

export default AdminAppHeader;
