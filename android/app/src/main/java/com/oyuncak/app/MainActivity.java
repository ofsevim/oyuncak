package com.oyuncak.app;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ekranı uyanık tut (oyun sırasında kapanmasın)
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Status bar'ı koyu arka plana göre ayarla
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(android.graphics.Color.parseColor("#0f1219"));
        getWindow().setNavigationBarColor(android.graphics.Color.parseColor("#0f1219"));
    }
}
