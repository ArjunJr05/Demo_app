package com.example.salesiq;

import android.app.Application;
import com.zoho.salesiqembed.ZohoSalesIQ;

public class MyApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();

        ZohoSalesIQ.init(
            this,
            "t1OeQIU%2FmlrpMxqTO39iHaNPA0sI%2BHQ5AizEotzng3Wwtr%2BIsn9ZOK3%2B0ClJaj9X_in",
            "VXYedrQX8SnJRvzO%2FuvqFQjlbXi6YSbBo5L%2BVmToUTRNngPRgRjQqbwuU8T0jVeq%2FZYBNOatAgBBvd07aqZoqLAU%2F2ZD3bgmOwWB9jE6YMDrVyEdG%2BORHA%3D%3D"
        );
    }
}
